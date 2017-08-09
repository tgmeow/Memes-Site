//TODO: SET UP
//      ACTUAL SERVER&PAGES
//      SERVER PAGING REQ
//      DB REQUEST CACHING
//      CLIENT SIDE COM/PAGINATION
//      CLIENT SIDE ORG FOR FEED SORTINGS
//NOTE: USES GMT (UTC) TIME
console.log('-Server Init-');

const mysql = require('mysql');
const express = require('express');
const config = require('./config');
var app = express();


//Connect to db. USES POOLING
const sqlPool = mysql.createPool(config.db.connectionOp);
//test connection
sqlPool.getConnection(function(err, connection) {
    if (err) throw err;
    connection.release();
    console.log("DB connected!");
});
//END connect to db

/*****BEGIN VARIABLES*****/

//base string to begin sql query
const SQL_BASE_STRING = 'SELECT id, message, created_time, likes, from_id, type, full_picture, last_updated FROM ';
const SQL_BASE_COUNT = 'SELECT COUNT(id) AS count FROM '
//enumerate some const types to case switch db request
const SORT = {
    LIKES : {value: 0, name: 'likes'},  //Order by number of likes
    POSTED: {value: 1, name: 'posted'}  //Order by date posted
};
const ORDER = {
    DESC: {value: 2, name: 'desc'},    //high to low
    ASC : {value: 3, name: 'asc'}    //low to high (?)
    
};
//amount is amount of time (for easy math)
//Month and year require different code, in terms of months
const TIME = {
    HOUR : {value: 4, name: 'hour', amount: (3600*1000)},    //Within the last hour
    DAY : {value: 5, name: 'day',   amount: (24*3600*1000)},      //Within the last day
    WEEK : {value: 6, name: 'week', amount: (7*24*3600*1000)},    //Within the last week
    MONTH : {value: 7, name: 'month', amount: (1)},  //Within the last month
    YEAR : {value: 8, name: 'year', amount: (12)},    //Within the last year
    ALL : {value: 9, name: 'all', amount: (0)}       //no time bounds
};

//base time from which to calculate a range of time for a school year of memes in datetime (DANKEST MEMES OF 201#)
//SCHYLOWER is the beginning year range of the group and posts
const BOUND_TIME = {
    SCHYLOWER:{value:10, name: 'schyear', clip: '-08-01 00:00:00', amount: 12},
}

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
    if(typeof skip === 'number' || typeof skip === 'string'){
        skip = sqlPool.escape(parseInt(skip, 10));
        if(skip < config.queryBound.SKIP_MIN || isNaN(skip) || skip === Infinity) skip = config.queryBound.SKIP_MIN;
    }
    else skip = config.queryBound.SKIP_DEFAULT;
    if(typeof number === 'number' || typeof skip === 'string'){
        number = sqlPool.escape(parseInt(number, 10));
        if(isNaN(number) || number === Infinity) number = config.queryBound.NUMBER_DEFAULT;
        else if(number < config.queryBound.NUMBER_MIN) number = config.queryBound.NUMBER_DEFAULT;
        else if(number > config.queryBound.NUMBER_MAX) number = config.queryBound.NUMBER_DEFAULT;
    }
    else number = config.queryBound.NUMBER_DEFAULT; 
    return ' LIMIT ' + skip + ', ' + number;
}


//combines the three process functions into one
function processSortOrderNumSkip(sort, order, number, skip){
    return processSort(sort) + processOrder(order) + processNumSkip(number, skip);
}


//error check and return the where time range for a time span in TIME
//DEFAULT TIME.DAY
function processTime(time){
    let today = new Date();
    if(time == TIME.ALL){
        //do nothing
    } else if(time == TIME.HOUR || time == TIME.DAY || time == TIME.WEEK){
        today.setTime(today.getTime() - time.amount);
    } else if(time == TIME.MONTH || time == TIME.YEAR){
        today.setMonth(today.getMonth() - time.amount);
    } else{
        //time is not one of the listed elements or is null or undef. use default.
        time = TIME.DAY;
        today.setTime(today.getTime() - time.amount);
    }
    if(time != TIME.ALL){
        //Month is 0 based indexing
        let formattedTime = today.getUTCFullYear() + '-' + (today.getUTCMonth()+1) + '-' + today.getUTCDate()
            + ' ' + today.getUTCHours() + ':' + today.getUTCMinutes() + ':' + today.getUTCSeconds();
        return ' WHERE created_time > "' + formattedTime + '"';
    }
    else return '';
}

//escape, error check, and return the where from_id = string given an id
//DEFAULT return id = 0 for bad id
function processFromID(id){
    if(typeof id === 'string' || typeof id === 'number'){
        id = sqlPool.escape(id + ''); //turn id into a string by adding empty string in case of NaN or Infinity
        return ' WHERE from_id = ' + id;
    }
    else return ' WHERE from_id = 0';
}

//Get most recent school year based on date clip
//USES BOUND_TIME.SCHYLOWER.clip AS DATE CLIP
function getMostRecentSchoolYear(){
    let clipTime = BOUND_TIME.SCHYLOWER.clip;
    let today = new Date();
    //check which school year we are in based today's date compated to clip value
    let clipDate = new Date( today.getUTCFullYear() + clipTime + ' GMT');
    if(today < clipDate){ //next school year has not begun, so use last school year
        return today.getUTCFullYear()-1;
    } else return today.getUTCFullYear();
}

//error check and return the where year string for a bound date range in BOUND_TIME
//DEFAULT MOST RECENT SCHOOL YEAR
//USES BOUND_TIME.SCHYLOWER.clip AS DATE CLIP
function processBoundYear(year){
    let clipTime = BOUND_TIME.SCHYLOWER.clip;
    if(typeof year === 'number' || typeof year === 'string'){
        year = sqlPool.escape(parseInt(year, 10));
        //CHECK YEAR BOUNDS FOR REASONABLE YEARS
        if(isNaN(year) || year === Infinity
            || year < config.queryBound.YEAR_MIN || year > config.queryBound.YEAR_MAX)
            {
                year = getMostRecentSchoolYear();
            }
    } else{
        year = getMostRecentSchoolYear();
    }
    return ' WHERE created_time > "' + year + clipTime + '" AND created_time < "' + (parseInt(year)+1) + clipTime + '"'; 
}


//function to get entries from database using a pooled connection, given a query and a callback function.
//No error handling
function pooledQuery(sqlQuery, callback){
    console.log(sqlQuery); //debug ONLY
    sqlPool.getConnection(function(err, connection){
        connection.query(sqlQuery, function(err, res){
            connection.release();
            if(err) console.log('Error getting data from db!');
            else {
                if(typeof callback === 'function') callback(err, res);
                else console.log('Error query callback is not a function.');
            }
        });
    }); //END POOL
}

//Get entries from database. Params are sorting, order, time, number, and how many to skip (for pagination)
//Callback(err, res) err message and res as array of entries with:
//  post id (for url linking), message, created time, likes, poster id , type, picture url(not sure if permalink)
function getRecentDBData(sort, order, time, number, skip, callback){
    //TIME (in server is stored as UTC datetime) DEFAULT: time == DAY
    //SORT AND ORDER. DEFAULT likes DESC //NUMBER AND SKIP. DEFAULT number = 20 (LIMIT 100) and skip = 0
    let sqlQuery = SQL_BASE_STRING + config.db.tableName + processTime(time)
        + processSortOrderNumSkip(sort, order, number, skip);
    pooledQuery(sqlQuery, callback);
}

//Get entries from database. Params are sorting, order, bound year range, number, and how many to skip (for pagination)
//Callback(err, res) err message and res as array of entries with:
//  post id (for url linking), message, created time, likes, poster id , type, picture url(not sure if permalink)
function getBoundDBData(sort, order, year, number, skip, callback){
    //YEAR: DEFAULT IS MOST RECENT YEAR
    //SORT AND ORDER. DEFAULT likes DESC //NUMBER AND SKIP. DEFAULT number = 20 (LIMIT 100) and skip = 0
    let sqlQuery = SQL_BASE_STRING + config.db.tableName + processBoundYear(year)
        + processSortOrderNumSkip(sort, order, number, skip);

    pooledQuery(sqlQuery, callback);
}

//gets paginated posts from a user, given an id 'from_id'
//returns the posts
function getPostsByUser(from_id, sort, order, number, skip, callback){
    let sqlQuery = SQL_BASE_STRING + config.db.tableName + processFromID(from_id)
        + processSortOrderNumSkip(sort, order, number, skip);
    
    pooledQuery(sqlQuery, callback);
}

//Gets the count of number of rows of a 'recentDBData' query
//returns count
function getRecentDBDataCount(time, callback){
    let sqlQuery = SQL_BASE_COUNT + config.db.tableName + processTime(time);
    pooledQuery(sqlQuery, callback);
}

//Gets the count of number of rows of a 'boundDBData' query
//returns count
function getBoundDBDataCount(year, callback){
    let sqlQuery = SQL_BASE_COUNT + config.db.tableName + processBoundYear(year);
    pooledQuery(sqlQuery, callback);
}

//Gets the count of number of rows of a PostsByUser query
//returns count
function getPostsByUserCount(from_id, callback){
    let sqlQuery = SQL_BASE_COUNT + config.db.tableName + processFromID(from_id);
    pooledQuery(sqlQuery, callback);
}


//SERVER FUNCTIONS
//Matches query strings to objects, default time over bound_time Returns object with matched objects
function parseQueryParams(query){
    //p OR NOT q to determine priority of time vs boundtime
    //let useTime = ('time' in query) || !('bound_time' in query);

    query.sort = ('sort' in query) ? query.sort : '';
    query.order = ('order' in query) ? query.order : '';
    query.time = ('time' in query) ? query.time : '';
    query.count = ('count' in query) ? query.count : '';
    query.skip = ('skip' in query) ? query.skip : '';

    //match string/number to predefined object
    let parsed = {};
    if(query.sort == SORT.LIKES.name) parsed.sort = SORT.LIKES;
    else if(query.sort == SORT.POSTED.name) parsed.sort = SORT.POSTED;
    else parsed.sort = SORT.LIKES;

    if(query.order == ORDER.ASC.name) parsed.order = ORDER.ASC;
    else if(query.order == ORDER.DESC.name) parsed.order = ORDER.DESC;
    else parsed.order = ORDER.DESC;

    parsed.bound = false;
    //if(useTime){
    if(query.time == TIME.HOUR.name) parsed.time = TIME.HOUR;
    else if(query.time == TIME.DAY.name) parsed.time = TIME.DAY;
    else if(query.time == TIME.WEEK.name) parsed.time = TIME.WEEK;
    else if(query.time == TIME.MONTH.name) parsed.time = TIME.MONTH;
    else if(query.time == TIME.YEAR.name) parsed.time = TIME.YEAR;
    else if(query.time == TIME.ALL.name) parsed.time = TIME.ALL;
    //else parsed.time = TIME.DAY;
    
    //query.time is not one of the TIME values, so try parsing it as an int to see if it is a valid time.
    else{
        const parseTest = sqlPool.escape(parseInt(query.time, 10));
        console.log(parseTest);
        if(isNaN(parseTest) || parseTest === Infinity
        || parseTest < config.queryBound.YEAR_MIN || parseTest > config.queryBound.YEAR_MAX)
        {
            //not valid as a year so default to time=day
            parsed.time = TIME.DAY;
        } else{
            //valid as a year
            parsed.time = parseTest;
            parsed.bound = true;
        }
    }
    //} 
    //else{ //using bound_time
        //do nothing with bound_time because it should just be a year. The functoin will handle errors and escape
        //parsed.bound_time = query.bound_time;
    //}

    //do nothing with count and skip because they should be numbers. The function will handle errors and escape
    parsed.count = query.count;
    parsed.skip = query.skip;
    return parsed;
}


/*****END FUNCTIONS*****/

/*****BEGIN SERVER ROUTING*****/

//CURRENT TYPES OF BROWSING:
//  TOP SINCE string
//  SCHOOL YEAR number
//  USER from_id
app.get('/data', function(req, res){
    //PARAMS:
    //sort order time count skip
    //parse/process/escape get params, options, idk

    //match string/number to predefined object. Handles XOR time/bounded_time
    let parsed = parseQueryParams(req.query);

    function handleDBResp(err, resp){
        if(err) console.log(err);

            //TEMP DEV ONLY
            res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            console.log(resp);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({data: resp}));
    }

    if('bound' in parsed && !parsed.bound)
    getRecentDBData(parsed.sort, parsed.order, parsed.time, parsed.count, parsed.skip, handleDBResp);

    else if('bound' in parsed && parsed.bound)
    getBoundDBData(parsed.sort, parsed.order, parsed.time, parsed.count, parsed.skip, handleDBResp);

    else console.log('ERROR WITH PARAM PARSING! NEVER SHOULD HAPPEN!');
});

// app.get('/', function(req, res){
//     res.setHeader('Content-Type', 'text/html');
//     res.send('//TODO: Insert dank memes');
// });

app.use(express.static('./build'));

// Handle 404
app.use(function (req, res) {
  res.status(404);
  res.send('404: Oops, no memes here O_O');
});

/*****END SERVER ROUTING*****/

app.listen(8080);

