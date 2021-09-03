# QCObjects Lib Cosmosdb

QCObjects Lib for work with Microsoft Cosmosdb Database.

## Instructions

1. Install this dependency in your project using npm

```shell
npm i --save qcobjects-lib-cosmosdb
```

2. In your config.json file, create the following settings

```shell
{
  "CosmosDB":{
    "endpoint": "$ENV(COSMOSDB_ENDPOINT)",
    "key": "$ENV(COSMOSDB_API_KEY)",
    "database": "$ENV(COSMOSDB_DATABASE)",
    "userAgentSuffix": "QCObjectsCosmosDBAPIClient",
    "partitionKey": ["$ENV(COSMOSDB_PARTITION_KEY)"]
  }
}
```

Above settings will bring the API Key values from the following environment variables:

COSMOSDB_ENDPOINT
COSMOSDB_API_KEY
COSMOSDB_DATABASE
COSMOSDB_PARTITION_KEY


Learn more about Accessing Microsoft CosmosDb in the official [Microsoft Documentation website](https://docs.microsoft.com/en-us/azure/cosmos-db/secure-access-to-data?tabs=using-primary-key)

5. Test the integration

```shell
npm test
```

4. Start the QCObjects HTTP2 Server

```shell
qcobjects-server
```
If you haven't installed QCObjects before, learn more about [Installing QCObjects here](https://docs.qcobjects.org/#installing)
