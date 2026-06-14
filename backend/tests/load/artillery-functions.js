// Custom processor functions for Artillery
// This file can be used to generate dynamic data for each virtual user

module.exports = {
  // Example: Generate a random string or compute a signature before a request
  beforeRequest: (requestParams, context, ee, next) => {
    // You can modify requestParams here if needed
    return next();
  },
  
  // Example: Extract data from a response
  afterResponse: (requestParams, response, context, ee, next) => {
    // You can log or manipulate data after response
    return next();
  }
};
