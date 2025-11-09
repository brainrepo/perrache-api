Fr1.1 - the open api endpoint should get the version as a query parameter, the default is 3.1
Fr1.2 - environment promotion not needed.
FR2.2 - for finding the semantical similarity we need two embeddings per each path/method, 

    1. one that contains the path/method and one that contains the body request schema and that 
        just contains the body request schema and that contains the body response schema, this 
        ensures to have the domain object similarity. the schemas are flattened to a string of this format
        attr.attrlevel2[] including also the anyOf, allOf, oneOf, arrays should contains the items schema. 
        The flattening is recursive. 
    2. On for the overall path/method json including headers, parameters etc.

    note: the $refs should be resolved before the flattening.
    note: the schemas should be validated before the flattening.

Fr3.1 - we cannot do person subscription because we do not have an auth system.
Fr3.3 - subscriber count should be related to the endpoint subscribers count.

FR4.1 - we should compare and search multiple libs, @pb33f/openapi-changes is a good candidate, but we should also look at other libs.

Fr4.4 - notification email and in app should be added just when account is created, but
        they could work to the email of the owner of the service that depend on the 
        breaking changed api.
        Consumer acknowledgement can be added when we will have a user system.
        
Fr4.5 - Auto-clear risk flag reset manually

Fr5.1 - mark the badge can be done when we will have an auth user role system




Fr1.1 - how we will handle the async processing of the open api spec? Can it be sync? If multiple 
        specs should be added in parallel we can add a batch endpoint.
Fr2.1 - how you estimate the latency?


