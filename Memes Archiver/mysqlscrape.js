//TODO: find way to get token(s) here? 
    //NOTE: Authentication is generally used for client side 'users' not server side processing. See passport example.
//TODO: create retry capability?

//TODO: Error handling and remove throw on error
//TODO: xxx SHARED A LINK HAS TYPE LINK AND FIELD LINK. NOT CURRENTLY INCLUDED IN SCRAPE

//TODO: IMPORTANT: REMOVE ENTRIES THAT NO LONGER EXIST

//NOTE: Batch responses and nested requests via field expansion is possible
//but difficult to implement (with error handling) and potentially confusing
//if one of the ids is 'deleted'

console.log('-Scraper Init-');
//increaes threadpool size to enable better async threading(?)
process.env.UV_THREADPOOL_SIZE = 128;

const graph = require('fbgraph');
const mysql = require('mysql');
const config = require('./config');

graph.setAccessToken(config.graph.long_token);
graph.setVersion('2.10');

//Connect to db
const sqlcon = mysql.createConnection(config.db.connectionOp);
sqlcon.connect(function(err) {
  if (err) throw err;
  console.log("DB connected!");
});

/**LIST OF ERRORS I'VE ENCOUNTERED:
 * ETIMEDOUT:
            { message: 'Error processing https request',
                exception:
                    { Error: ETIMEDOUT

 * User request limit:
            { message: '(#17) User request limit reached',
 ** Post no longer exists? 910328079022678 //fixed
  err and res
  null
  { data: [] }
    api graph explorer:
    {
        "error": {
            "message": "No node specified",
            "type": "GraphMethodException",
            "code": 100,
 ** Post no longer exists? 1688130864575725 //fixed
    {
        "error": {
            "message": "Unsupported get request. Object with ID '1688130864575725' does not exist, cannot be loaded due to missing permissions, or does not support this operation. Please read the Graph API documentation at https://developers.facebook.com/docs/graph-api",
            "type": "GraphMethodException",
            "code": 100,
 **/



/****BEGIN FUNCTIONS****/

//updated_time definition: what is an update? updated_time changes upon a comment (or edit?). Does not update on LIKES
//get data from FB and get correct number of likes and save all to db. Uses paging.
//INSERT updated feed elements. UPDATE on duplicates (id)
//since is the updated_time of the most recent entry (updated_time UNIX format) in the DB
//If since value is not given, gets ALL EXISTING data until no more pages
//{since} remains constant through paging
//Function ends when data does not have next paging
function getFeed(since, until){

    let feedCount = 0;      //progress counter //number of legit post elements that can be added
    let finishedQueryCount = 0; //completed db add query progress counter
    //let endPages = false;
    let pageNext = '';

    //insert or update values in database
    function insertUpdateDB(values, callback){
        let sqlQuery = 'INSERT INTO ' + config.db.tableName + ' (id, message, updated_time, created_time, likes, from_id, type, full_picture)'
            + ' VALUES ? ON DUPLICATE KEY UPDATE '
            + 'message = VALUES(message)' + ', '
            + 'updated_time = VALUES(updated_time)' + ','
            + 'likes = VALUES(likes)';
        sqlcon.query(sqlQuery, [values], function(err, res){
            if(err){
                //console.log('ERROR INSERTING DATA. QUERY: ' + sqlQuery);
                console.log(err);
                throw err;
            }
            else{
                finishedQueryCount += values.length;
                console.log('Inserted ' + values.length + ' entries.' + finishedQueryCount + ' : ' + feedCount);

                if(typeof callback === 'function')  callback(err, res);
            }
        });
    } //END insertUpdateDB

    //function gets a page and browses through the pagination to update the db. Calls itself.
    function getFeedPage(since, until){
        let sinceStr = (since == '' || since == null || since === undefined) ? '' : ('&since=' + since);
        let untilStr = (until == '' || until == null || until === undefined) ? '' : ('&until=' + until);
        //console.log(sinceStr + ':' + untilStr);
        //while res has paging.next, make a get to paging.next
        //console.log("CURRENT URL: " + config.fb.groupID+config.fb.groupPath+config.feed.groupOptions+pageNext+sinceStr+untilStr);
        graph.setOptions(config.http.options).get(config.fb.groupID+config.fb.groupPath+config.feed.groupOptions+pageNext+sinceStr+untilStr, function(err, res) {
            until = ''; //next url possibly contains modified until and since value
            since = '';
            if(err){
                console.log('GRAPH GET ERROR');
                console.log(err);
                throw err;
            }
            else if('data' in res && res.data.length > 0){
                feedCount += res.data.length;
                console.log('Page Feed Elements: ' + feedCount);

                //reformat data
                let values = [];
                let valuesCount = 0; //count how many graph id reqs have been satisfied
                for(let i = 0; i < res.data.length; i++){
                    //console.log(res.data[i].message);
                    //time needs to be reformatted
                    let type = res.data[i].type;
                    
                    let likes = 0;
                    if('reactions' in res.data[i] && 'summary' in res.data[i].reactions) likes = res.data[i].reactions.summary.total_count;

                    let picURL = ((type == 'photo' || type == 'video') && 'full_picture' in res.data[i]) ? res.data[i].full_picture : '';
                    let curData = [res.data[i].id.split('_')[1], res.data[i].message, res.data[i].updated_time.split('+')[0],
                        res.data[i].created_time.split('+')[0], likes, res.data[i].from.id, type, picURL];
                    
                    //When values.length = res.data.length, insert to SQL.
                    
                    valuesCount++;

                    //console.log(curData.toString());
                    //Insert complete curData into values[] and update with one sql call
                    values.push(curData);
                    
                    //sql query with all data
                    if(valuesCount == res.data.length){
                        insertUpdateDB(values);
                    }
                     
                }
            }
            
            //if next exists, continue looping on next
            if('paging' in res && 'next' in res.paging){
                //parse url with split and add needed pieces to next url
                //console.log(res.paging.next);
                let split = res.paging.next.split('&');
                pageNext = '';
                for(let i = 0; i < split.length; i++){
                    split[i] = split[i].split('=');
                    if(split[i][0] == '__paging_token' || split[i][0] == 'until' || split[i][0] == 'since'){
                        pageNext += '&' + split[i][0] + '=' + split[i][1];
                    }
                }
                //console.log(pageNext);
                getFeedPage(since, until);
            } else{
                //pageNext = '';
                console.log('END: NO MORE PAGES');
                console.log('Total ' + feedCount + ' new posts.');
            } 
        }); //END graph request
    } //END getFeedPage

    
    getFeedPage(since, until);


} //END function getFeed


//a helper function that gets the most recent or oldest updated_times from the db and gets either the older or newer posts
//if no params are provided, gets and updates/inserts all feed elements.
function getPosts(getOldPosts, getNewPosts){
    let sqlSinceQuery = 'SELECT MAX(updated_time) as updated_time FROM ' + config.db.tableName;
    let sqlUntilQuery = 'SELECT MIN(updated_time) as updated_time FROM ' + config.db.tableName;
    sqlcon.query(sqlSinceQuery, function(err, res){
        if(err){
            console.log('Error getting most recent entry in DB');
            console.log(err);
            throw err;
        }
        else{
            let dbSince = '';
            if(getNewPosts && 'updated_time' in res[0]){
                console.log(res[0].updated_time);
                dbSince = Date.parse(res[0].updated_time + ' GMT')/1000;
            }

            sqlcon.query(sqlUntilQuery, function(err, resp){
                let dbUntil = '';
                if(getOldPosts && 'updated_time' in resp[0]){
                    console.log(resp[0].updated_time);
                    dbUntil = Date.parse(resp[0].updated_time + ' GMT')/1000;
                }
                console.log(dbSince + ' ' + dbUntil);
                getFeed(dbSince, dbUntil);
            });
        }
    });
} //END function getPosts


//function to get number of reactions given an ID.
//callback(err, response);
//when post no longer exists, summary is not in respo. callback with -1 to preserve data? OR delete entry??
function getIDLikes(id, callback, retry){
    graph.setOptions(config.http.options).get(id + config.update.likesOptions, function (err, respo){
        let doCB = typeof callback === 'function';
        if(err){
            let postDeleted1 = 'message' in err && err.message.substring(0,39)=='Unsupported get request. Object with ID';
            let postDeleted2 = 'message' in err && err.message == 'No node specified';
            if(postDeleted1){
                console.log('WARN: Post deleted1. id: ' + id);
                if(doCB) callback(null, -1);
            } else if(postDeleted2){
                console.log('WARN: Post deleted2. id: ' + id);
                if(doCB) callback(null, -1);
            }
            else{
                //console.log('Graph GET ID LIKES (function) Error Retry: ' + retry);
                //retry request
                if(!retry || retry < 1){
                    getIDLikes(id, callback, retry?retry+1:1);
                } else{
                    //console.log(err);
                    if(doCB) callback(err, respo);
                }
            }
        }
        else if('reactions' in respo && 'summary' in respo.reactions){
            if(doCB)
                callback(err, respo.reactions.summary.total_count);
        }
        else{
            console.log('WARN: Post no longer exists?? SHOULD NOT HAPPEN ' + id);
            if(doCB) callback(err, -1);
        }
    });
}


//since is lower bound, until is upper bound
//Necessary since updated_time is not modified upon new like
//Update LIKES of ALL EXISTING entries in DB between given time value(s) created_time datetime format.
//If value(s) are not given, updates ALL EXISTING entries
//Does NOT add NEW entries.
//MAY NOT WORK IN PARALLEL WITH ADDING NEW ENTRIES!!!
function updateExistingFeedData(since, until, offsetInit){
    let datesBound =  (since?' WHERE created_time > "'+since+'"':'')+((since&&until)?' AND':'')+(until?' WHERE created_time < "'+until:'');
    let sqlNumQuery = 'SELECT COUNT(id) AS count FROM ' + config.db.tableName + datesBound;
    sqlcon.query(sqlNumQuery, function(err, res){
        if(err){
            console.log('Error getting number entries!');
            console.log(err);
        }
        else{
            console.log('Total ' + res[0].count);
            let total = res[0].count; //total elements in the db
            let dbReq = 0; //running count of elements requested from the database
            //let gGot = 0;
            let dbUpdated = 0; //elements that have been updated in the db, DOES NOT INCLUDE ERROR
            let errorCount = 0; //feed elements that are missing or some error
            let offset = offsetInit;

            //function that checks and prints the current update progress.
            //can call dbQueryUpdate() ... spahgetti code?
            function processUpdateProgress(){
                //updates caught up with db pagination, continue with next page
                //console.log('function progress' + (dbUpdated+errorCount) + ' : ' + dbReq);
                //ensure that the counts are equal
                if(dbUpdated+errorCount == dbReq){
                    //last element updated. No more elements
                    if(dbUpdated+errorCount == total){
                        console.log('Updated all entries.');
                    }
                    //we have not gotten all elements, so continue with updates.
                    else dbQueryUpdate();
                }
            } //END processUpdateProgress

            //make db query to get paginated list of id bounded by since and until
            function dbQueryUpdate(){
                let sqlGetIDQuery = 'SELECT id FROM ' + config.db.tableName + datesBound +  ' ORDER BY last_updated asc LIMIT ' + offset +', ' + config.feed.limitCount;
                //console.log(sqlGetIDQuery);
                sqlcon.query(sqlGetIDQuery, function(err, resp){
                    if(err){
                        console.log('Error getting entries from DB!');
                        console.log(err);
                        throw err;
                    }
                    else{
                        console.log('Got: ' + resp.length);
                        dbReq += resp.length;
                        offset += config.feed.limitCount;
                        //for each resp element, make graph request of id for num likes
                        let values = [];
                        let curGGot = 0; //response counter for each for loop, DOES NOT INCLUDE ERROR
                        let curErr = 0; //error counter for each for loop
                        for(let i = 0; resp.length!=0 && i < resp.length; i++){
                            getIDLikes(resp[i].id, function(err, likesRes){
                                if(err){
                                    console.log('Error getting number of likes!');
                                    console.log(err);
                                    throw err;
                                }
                                //console.log(curGGot + ' : ' + curErr + ' : ' + resp.length);
                                //-1 if post no longer exists or something similar
                                if(likesRes != -1){
                                    curGGot++;
                                    //likesRes is a number
                                    
                                    let today = new Date();
                                    let formattedTime = today.getUTCFullYear() + '-' + (today.getUTCMonth()+1) + '-' + today.getUTCDate()
                                        + ' ' + today.getUTCHours() + ':' + today.getUTCMinutes() + ':' + today.getUTCSeconds() + '.' + today.getUTCMilliseconds();

                                    let data = [this.id, likesRes, formattedTime];
                                    values.push(data);

                                } //end if
                                else {
                                    //consider entry an error
                                    errorCount++;
                                    curErr++;
                                } //end else

                                //Check when all values have been received.
                                //make db query to update id
                                if(curGGot+curErr == resp.length){
                                    let sqlUpdateLikes = 'INSERT INTO ' + config.db.tableName + ' (id, likes, last_updated)'
                                        + ' VALUES ? ON DUPLICATE KEY UPDATE '
                                        + 'likes = VALUES(likes),'
                                        + ' last_updated = VALUES(last_updated)';
                                    //console.log(sqlUpdateLikes);
                                    //console.log(values);
                                    sqlcon.query(sqlUpdateLikes, [values], function(err, res){
                                        if(err){
                                            //console.log('ERROR INSERTING DATA. QUERY: ' + sqlQuery);
                                            console.log(err);
                                            throw err;
                                        }
                                        else{
                                            dbUpdated += curGGot;
                                            console.log('Inserted ' + values.length + ' entries, ' + curErr + ' errors. ' + dbUpdated + ' : ' + total + ' err: ' + errorCount);
                                            //check progress at the end when values have been inserted into db
                                            processUpdateProgress();
                                        }
                                    }); //END sql update query
                                } //END if

                            }.bind( {id : resp[i].id} ) ); //END get likes
                        } //END sql res loop
                    } //END else
                }); //END sql pagination query
            } //END db update function

            dbQueryUpdate();


        }//END else
    }); //END sqlnum query
} //END function updateExistingFeedData

/****END FUNCTIONS****/

console.log('Beginning data scrape...');
//updateExistingFeedData(null, null, 0);
getPosts(false, true);
