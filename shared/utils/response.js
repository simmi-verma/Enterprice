
// standardize the json response from your backend so that all apis follow the same format
//--- send successful response

const success=(res, data={}, message="Success", statusCode=200)=>{
    res.status(statusCode).json({success: true, message, data, timestamp:new Date().toISOString()});
}

//--used when response is successful created

const created=(res, data={}, message="Created Successfully")=> success(res, data, message, 201);

// send an error response
const error=(res, message="Internal server error" , statusCode=500, error=null)=>{
    res.status(statusCode).json({
        success:false,
        message,
        ...(error && {error}),
        timestamp:new Date().toISOString(),
    })
}
// used when returning paginated data
const paginated=(res, data, pagination, message="Success")=>
    res.status(200).json({
        success: true, 
        message,
        data,
        pagination,
    timestamp:new Date().toISOString(),
    });

    module.exports={success, created, error, paginated};