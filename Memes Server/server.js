//TODO: SET UP
//      ACTUAL SERVER&PAGES
//      SERVER PAGING REQ
//      REQUEST CACHING
//      CLIENT SIDE COM/PAGINATION
//      CLIENT SIDE ORG FOR FEED SORTINGS

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


//Get entries from database. Params are sorting, order, time, number, and how many to skip (for pagination)
//Callback(err, res) err message and res as array of entries with:
//  post id (for url linking), message, created time, likes, poster id , type, picture url(not sure if permalink)
function getDBData(sort, order, time, number, skip, callback){
    //base query
    let sqlQuery = 'SELECT id, message, created_time, likes, from_id, type, full_picture FROM ' + config.db.tableName;
    let today = new Date();
    //WHERE TIME (in server is stored as UTC datetime) DEFAULT: time == DAY
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
    if(sort == SORT.LIKES){
        sqlQuery += ' ORDER BY likes';
    } else{
        sqlQuery += ' ORDER BY created_time';
    }
    if(order == SORT.ASC){
        sqlQuery += ' ASC';
    } else{
        sqlQuery += ' DESC';
    }
    //NUMBER AND SKIP. DEFAULT number = 20 (LIMIT 100) and skip = 0
    if(typeof skip != 'number') skip = 0;
    else if(skip < 0) skip = 0;
    if(typeof number != 'number') number = 20;
    else if(number < 0) number = 0;
    else if(number > 100) number = 100;
    
    sqlQuery += ' LIMIT ' + skip + ', ' + number;

    console.log(sqlQuery); //debug
    sqlPool.getConnection(function(err, connection){
        connection.query(sqlQuery, function(err, res){
            connection.release();
            if(err) return console.log('Error getting data from db!');
            else if(typeof callback == 'function') callback(err, res);
        });
    }); //END POOL
}
//END FUNCTIONS

getDBData(SORT.POSTED, ORDER.DESC, TIME.DAY, 2, 0, function(err, res){
    if(err) console.log(err);
    else{
        console.log(res);
    }
});
