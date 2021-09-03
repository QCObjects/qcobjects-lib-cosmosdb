const fs = require("fs");
const path = require("path");
const absolutePath = path.resolve(__dirname, "./");

describe("Cosmos DB Main Test", function () {
  var originalTimeout;

  beforeEach(function() {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000000;
  });

  //@ts-check
  const CosmosClient = require("@azure/cosmos").CosmosClient;

  const config = require(absolutePath+"/cosmosDbTestData.js");
  const url = require("url");

  it("Cosmos Test Spec", function (done) {

    const endpoint = config.endpoint;
    const key = config.key;

    const databaseId = config.database.id;
    const containerId = config.container.id;
    const partitionKey = { kind: "Hash", paths: ["/partitionKey"] };

    const options = {
          endpoint: endpoint,
          key: key,
          userAgentSuffix: "CosmosDBJavascriptQuickstart"
        };

    const client = new CosmosClient(options);

    /**
     * Create the database if it does not exist
     */
    async function createDatabase() {
      const { database } = await client.databases.createIfNotExists({
        id: databaseId
      });
      console.log(`Created database:\n${database.id}\n`);
      return 1;
    }

    /**
     * Read the database definition
     */
    async function readDatabase() {
      const { resource: databaseDefinition } = await client
        .database(databaseId)
        .read();
      console.log(`Reading database:\n${databaseDefinition.id}\n`);
      return 2;
    }

    /**
     * Create the container if it does not exist
     */
    async function createContainer() {
      const { container } = await client
        .database(databaseId)
        .containers.createIfNotExists(
          { id: containerId, partitionKey }
        );
      console.log(`Created container:\n${config.container.id}\n`);
      return 3;
    }

    /**
     * Read the container definition
     */
    async function readContainer() {
      const { resource: containerDefinition } = await client
        .database(databaseId)
        .container(containerId)
        .read();
      console.log(`Reading container:\n${containerDefinition.id}\n`);
      return 4;
    }

    /**
     * Scale a container
     * You can scale the throughput (RU/s) of your container up and down to meet the needs of the workload. Learn more: https://aka.ms/cosmos-request-units
     */
    async function scaleContainer() {
      const { resource: containerDefinition } = await client
        .database(databaseId)
        .container(containerId)
        .read();

      try
      {
          const {resources: offers} = await client.offers.readAll().fetchAll();

          const newRups = 500;
          for (var offer of offers) {
            if (containerDefinition._rid !== offer.offerResourceId)
            {
                continue;
            }
            offer.content.offerThroughput = newRups;
            const offerToReplace = client.offer(offer.id);
            await offerToReplace.replace(offer);
            console.log(`Updated offer to ${newRups} RU/s\n`);
            break;
          }
      }
      catch(err)
      {
          if (err.code == 400)
          {
              console.log("Cannot read container throuthput.\n");
              console.log(err.body.message);
          }
          else
          {
              throw err;
          }
      }
      return 6;
    }

    /**
     * Create family item if it does not exist
     */
    async function createFamilyItem(itemBody) {
      const { item } = await client
        .database(databaseId)
        .container(containerId)
        .items.upsert(itemBody);
      console.log(`Created family item with id:\n${itemBody.id}\n`);
      return 7;
    }

    /**
     * Query the container using SQL
     */
    async function queryContainer() {
      console.log(`Querying container:\n${config.container.id}`);

      // query to return all children in a family
      // Including the partition key value of country in the WHERE filter results in a more efficient query
      const querySpec = {
        query: "SELECT VALUE r.children FROM root r WHERE r.partitionKey = @country",
        parameters: [
          {
            name: "@country",
            value: "USA"
          }
        ]
      };

      const { resources: results } = await client
        .database(databaseId)
        .container(containerId)
        .items.query(querySpec)
        .fetchAll();
      for (var queryResult of results) {
        let resultString = JSON.stringify(queryResult);
        console.log(`\tQuery returned ${resultString}\n`);
      }
      return 8;
    }

    /**
     * Replace the item by ID.
     */
    async function replaceFamilyItem(itemBody) {
      console.log(`Replacing item:\n${itemBody.id}\n`);
      // Change property 'grade'
      itemBody.children[0].grade = 6;
      const { item } = await client
        .database(databaseId)
        .container(containerId)
        .item(itemBody.id, itemBody.partitionKey)
        .replace(itemBody);
        return 9;
    }

    /**
     * Delete the item by ID.
     */
    async function deleteFamilyItem(itemBody) {
      await client
        .database(databaseId)
        .container(containerId)
        .item(itemBody.id, itemBody.partitionKey)
        .delete(itemBody);
      console.log(`Deleted item:\n${itemBody.id}\n`);
      return 10;
    }

    /**
     * Cleanup the database and collection on completion
     */
    async function cleanup() {
      await client.database(databaseId).delete();
    }

    /**
     * Exit the app with a prompt
     * @param {string} message - The message to display
     */
    function exit(message) {
      console.log(message);
      console.log("Press any key to exit");
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", process.exit.bind(process, 0));
    }

    createDatabase()
      .then(() => readDatabase())
      .then(() => createContainer())
      .then(() => readContainer())
      .then(() => scaleContainer())
      .then(() => createFamilyItem(config.items.Andersen))
      .then(() => createFamilyItem(config.items.Wakefield))
      .then(() => queryContainer())
      .then(() => replaceFamilyItem(config.items.Andersen))
      .then(() => queryContainer())
      .then(() => deleteFamilyItem(config.items.Andersen))
      .then((completedTasks) => {
        console.log ("Success");
        expect (completedTasks).toEqual(10);
        done();
      })
      .catch(error => {
        console.log (`Completed with error ${JSON.stringify(error)}`);
        done(new Error (`Completed with error ${JSON.stringify(error)}`));
      });

  });
});
