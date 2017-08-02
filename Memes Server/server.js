//TODO: SET UP
//      ACTUAL SERVER&PAGES
//      SERVER PAGING REQ
//      REQUEST CACHING
//      CLIENT SIDE COM/PAGINATION
//      CLIENT SIDE ORG FOR FEED SORTINGS
//NOTE: USES GMT (UTC) TIME
console.log('-Server Init-');

const mysql = require('mysql');
const config = require('./config');

//Connect to db. USES POOLING
const sqlPool = mysql.createPool(config.db.connectionOp);
//test connection
sqlPool.getConnection(function(err, connection) {
    connection.release();
    if (err) throw err;
    console.log("DB connected!");
});
//END connect to db

/*****BEGIN VARIABLES*****/

//base string to begin sql query
const SQL_BASE_STRING = 'SELECT id, message, created_time, likes, from_id, type, full_picture FROM ';
//enumerate some const types to case switch db request
const SORT = {
    LIKES : {value: 0, name: 'Likes'},  //Order by number of likes
    POSTED: {value: 1, name: 'Posted'}  //Order by date posted
};
const ORDER = {
    DESC: {value: 2, name: 'Descending'},    //high to low
    ASC : {value: 3, name: 'Ascending'}    //low to high (?)
    
};
//amount is amount of time (for easy math)
//Month and year require different code, in terms of months
const TIME = {
    HOUR : {value: 4, name: 'Hour', amount: (3600*1000)},    //Within the last hour
    DAY : {value: 5, name: 'Day',   amount: (24*3600*1000)},      //Within the last day
    WEEK : {value: 6, name: 'Week', amount: (7*24*3600*1000)},    //Within the last week
    MONTH : {value: 7, name: 'Month', amount: (1)},  //Within the last month
    YEAR : {value: 8, name: 'Year', amount: (12)},    //Within the last year
    ALL : {value: 9, name: 'All', amount: (0)}       //no time bounds
};

//base time from which to calculate a range of time for a school year of memes in datetime (DANKEST MEMES OF 201#)
//SCHYLOWER is the beginning year range of the group and posts
const BOUND_TIME = {
    SCHYLOWER:{value:10, name: 'By school year MIN RANGE', clip: '-08-01 00:00:00', amount: 12},
}
const YEAR_MIN = 1970;
const YEAR_MAX = 9900;


/*****END VARIABLES*****/

/*****BEGIN FUNCTIONS*****/

//error checks and returns a string containing the SQL query for sort.
//DEFAULT LIKES
function processSort(sort){
    if(sort == SORT.POSTED) return ' ORDER BY created_time';
    else return ' ORDER BY likes';
}


//error checks and returns a string containing the SQL query for order.
//DEFAULT DESC
function processOrder(order){
    if(order == SORT.ASC) return ' ASC';
    else return ' DESC';
}


//error checks and returns a string containing the SQL query for number of entries and skip
//DEFAULT get 20 skip 0
function processNumSkip(number, skip){
    if(typeof skip != 'number') skip = config.queryBound.SKIP_DEFAULT;
    else if(skip < config.queryBound.SKIP_MIN) skip = config.queryBound.SKIP_MIN;
    if(typeof number != 'number') number = config.queryBound.NUMBER_DEFAULT;
    else if(number < config.queryBound.NUMBER_MIN) number = config.queryBound.NUMBER_MIN;
    else if(number > config.queryBound.NUMBER_MAX) number = config.queryBound.NUMBER_MAX;
    return ' LIMIT ' + skip + ', ' + number;
}


//combines the three process functions into one
function processSortOrderNumSkip(sort, order, number, skip){
    return processSort(sort) + processOrder(order) + processNumSkip(number, skip);
}


//Get entries from database. Params are sorting, order, time, number, and how many to skip (for pagination)
//Callback(err, res) err message and res as array of entries with:
//  post id (for url linking), message, created time, likes, poster id , type, picture url(not sure if permalink)
function getRecentDBData(sort, order, time, number, skip, callback){
    //base query
    let sqlQuery = SQL_BASE_STRING + config.db.tableName;
    let today = new Date();

    //TIME (in server is stored as UTC datetime) DEFAULT: time == DAY
    if(time == TIME.ALL){
        //do nothing
    } else if(time == TIME.HOUR || time == TIME.DAY || time == TIME.WEEK){
        today.setTime(today.getTime() - time.amount);
    } else if(time == TIME.MONTH || time == TIME.YEAR){
        today.setMonth(today.getMonth() - time.amount);
    } else{
        //time is not one of the listed elements or is null or undef. use default.
        time == TIME.DAY;
        today.setTime(today.getTime() - time.amount);
    }
    if(time != TIME.ALL){
        //Month is 0 based indexing
        let formattedTime = today.getUTCFullYear() + '-' + (today.getUTCMonth()+1) + '-' + today.getUTCDate()
            + ' ' + today.getUTCHours() + ':' + today.getUTCMinutes() + ':' + today.getUTCSeconds();
        sqlQuery += ' WHERE created_time > "' + formattedTime + '"';
    }

    //SORT AND ORDER. DEFAULT likes DESC
    //NUMBER AND SKIP. DEFAULT number = 20 (LIMIT 100) and skip = 0
    sqlQuery += processSortOrderNumSkip(sort, order, number, skip);

    //CALLBACK
    //console.log(sqlQuery); //debug
    sqlPool.getConnection(function(err, connection){
        connection.query(sqlQuery, function(err, res){
            connection.release();
            if(err) console.log('Error getting data from db!');
            else if(typeof callback == 'function') callback(err, res);
        });
    }); //END POOL
}

function getBoundDBData(sort, order, year, number, skip, callback){
    //base query
    let sqlQuery = SQL_BASE_STRING + config.db.tableName;

    //YEAR: DEFAULT IS MOST RECENT YEAR
    if(typeof year === 'number'){
        //CHECK YEAR BOUNDS FOR REASONABLE YEARS
        if(year < config.queryBound.YEAR_MIN) year = config.queryBound.YEAR_MIN;
        else if(year > config.queryBound.YEAR_MAX) year = config.queryBound.YEAR_MAX;
    } else{
        let today = new Date();
        //check which school year we are in based today's date compated to clip value
        let clipTime = new Date( today.getUTCFullYear() + BOUND_TIME.SCHYLOWER.clip + ' GMT');
        if(today < clipTime){ //next school year has not begun, so use last school year
            year = today.getUTCDate()-1;
        } else year = today.getUTCDate();
    }
    sqlQuery += ' WHERE created_time > "' + year + BOUND_TIME.SCHYLOWER.clip + '" AND created_time < "' + (year+1) + BOUND_TIME.SCHYLOWER.clip + '"'; 

    //SORT AND ORDER. DEFAULT likes DESC
    //NUMBER AND SKIP. DEFAULT number = 20 (LIMIT 100) and skip = 0
    sqlQuery += processSortOrderNumSkip(sort, order, number, skip);

    //CALLBACK
    console.log(sqlQuery); //debug
    sqlPool.getConnection(function(err, connection){
        connection.query(sqlQuery, function(err, res){
            connection.release();
            if(err){
                console.log('Error getting data from db!');
            }
            else if(typeof callback == 'function') callback(err, res);
        });
    }); //END POOL

}

/*****END FUNCTIONS*****/

// //Testing
// getRecentDBData(SORT.POSTED, ORDER.DESC, TIME.DAY, 2, 0, function(err, res){
//     if(err) console.log(err);
//     else{
//         console.log(res);
//     }
// });
// getBoundDBData(SORT.LIKES, ORDER.DESC, 2016, 200, 0, function(err, res){
//     if(err) console.log(err);
//     else{
//         console.log(res);
//     }
// });
