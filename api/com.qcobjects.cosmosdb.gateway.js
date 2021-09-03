/**
 * QCObjects CosmosDB Integration
 * ________________
 *
 * Author: Jean Machuca <correojean@gmail.com>
 *
 * Cross Browser Javascript Framework for MVC Patterns
 * QuickCorp/QCObjects is licensed under the
 * GNU Lesser General Public License v3.0
 * [LICENSE] (https://github.com/QuickCorp/QCObjects/blob/master/LICENSE.txt)
 *
 * Permissions of this copyleft license are conditioned on making available
 * complete source code of licensed works and modifications under the same
 * license or the GNU GPLv3. Copyright and license notices must be preserved.
 * Contributors provide an express grant of patent rights. However, a larger
 * work using the licensed work through interfaces provided by the licensed
 * work may be distributed under different terms and without source code for
 * the larger work.
 *
 * Copyright (C) 2015 Jean Machuca,<correojean@gmail.com>
 *
 * Everyone is permitted to copy and distribute verbatim copies of this
 * license document, but changing it is not allowed.
 */
/*eslint no-unused-vars: "off"*/
/*eslint no-redeclare: "off"*/
/*eslint no-empty: "off"*/
/*eslint strict: "off"*/
/*eslint no-mixed-operators: "off"*/
/*eslint no-undef: "off"*/
/*eslint no-useless-escape: "off"*/
"use strict";
const fs = require("fs");
const path = require("path");
const absolutePath = path.resolve(__dirname, "./");
const templatesPath = path.resolve(absolutePath, "../../templates/") + "/";
const CosmosClient = require("@azure/cosmos").CosmosClient;
const url = require("url");

"use strict";
Package("com.qcobjects.cosmosdb.gateway",[
  Class("CosmosDBGateway", {
    partitionKey: { kind: "Hash", paths: CONFIG.get("CosmosDB").partitionKey },

    getClient(){
      const endpoint = CONFIG.get("CosmosDB").endpoint;
      const key = CONFIG.get("CosmosDB").key;

      const options = {
            endpoint: endpoint,
            key: key,
            userAgentSuffix: CONFIG.get("CosmosDB").userAgentSuffix
          };

      const client = new CosmosClient(options);
      return client;
    },

    createDatabase (databaseId) {
      let gateway = this;
      let client = gateway.getClient();
      /**
       * Create the database if it does not exist
       */
      async function _createDatabase_(databaseId) {
        const { database } = await client.databases.createIfNotExists({
          id: databaseId
        });
        return database;
      }

      return _createDatabase_(databaseId)
        .then((database)=> {
          logger.debug(`Created database:\n${database.id}\n`);
        });
    },

    readDatabase (databaseId) {
      let gateway = this;
      let client = gateway.getClient();
      /**
       * Read the database definition
       */
      async function _readDatabase_(databaseId) {
        const { resource: databaseDefinition } = await client
          .database(databaseId)
          .read();
          return databaseDefinition;
      }

      return _readDatabase_(databaseId)
      .then ((databaseDefinition)=>{
        logger.debug(`Reading database:\n${databaseDefinition.id}\n`);

      });
    },

    createContainer (databaseId, containerId) {
      let gateway = this;
      let client = gateway.getClient();
      /**
       * Create the container if it does not exist
       */
      async function _createContainer_(databaseId, containerId) {
        const { container } = await client
          .database(databaseId)
          .containers.createIfNotExists(
            { id: containerId, partitionKey:gateway.partitionKey }
          );
        return container;
      }

      return _createContainer_(databaseId, containerId)
      .then((container)=> {
        logger.debug(`Created container:\n${container.id}\n`);
      });
    },

    readContainer (databaseId, containerId) {
      let gateway = this;
      let client = gateway.getClient();
      /**
       * Read the container definition
       */
      async function _readContainer_(databaseId, containerId) {
        const { resource: containerDefinition } = await client
          .database(databaseId)
          .container(containerId)
          .read();
        return containerDefinition;
      }
      return _readContainer_(databaseId, containerId)
      .then ((containerDefinition)=> {
        logger.debug(`Reading container:\n${containerDefinition.id}\n`);
      });
    },

    scaleContainer (databaseId, containerId) {
      let gateway = this;
      let client = gateway.getClient();
      /**
       * Scale a container
       * You can scale the throughput (RU/s) of your container up and down to meet the needs of the workload. Learn more: https://aka.ms/cosmos-request-units
       */
      async function _scaleContainer_(databaseId, containerId) {
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
              logger.debug(`Updated offer to ${newRups} RU/s\n`);
              break;
            }
        }
        catch(err)
        {
            if (err.code == 400)
            {
                logger.debug("Cannot read container throuthput.\n");
                logger.debug(err.body.message);
            }
            else
            {
                throw err;
            }
        }
        return 6;
      }

      return _scaleContainer_(databaseId, containerId);
    },

    createFamilyItem (databaseId, containerId, itemBody) {
      let gateway = this;
      let client = gateway.getClient();
      /**
       * Create family item if it does not exist
       */
      async function _createFamilyItem_(databaseId, containerId, itemBody) {
        console.log(itemBody);
        const { item } = await client
          .database(databaseId)
          .container(containerId)
          .items.upsert(itemBody);
          return item.read();
      }

      return _createFamilyItem_(databaseId, containerId, itemBody)
      .then ((item)=> {
        logger.debug(`Created family item with id:\n${item.id}\n`);
        return item;
      });

    },

    queryContainer (databaseId, containerId, query, params) {
      let gateway = this;
      let client = gateway.getClient();
      /**
       * Query the container using SQL
       */
      async function _queryContainer_(databaseId, containerId, query, params) {
        logger.debug(`Querying container:\n${containerId}`);

        // query to return all children in a family
        // Including the partition key value of country in the WHERE filter results in a more efficient query
        const querySpec = {
          query: query
        };
        if (typeof params !== "undefined"){
          querySpec.parameters = params;
        }

        const { resources: results } = await client
          .database(databaseId)
          .container(containerId)
          .items.query(querySpec)
          .fetchAll();
        return results;
      }
      return _queryContainer_(databaseId, containerId, query, params);
    },

    replaceFamilyItem (databaseId, containerId, itemBody, partitionKeyValue) {
      let gateway = this;
      let client = gateway.getClient();

      /**
       * Replace the item by ID.
       */
      async function _replaceFamilyItem_(databaseId, containerId, itemBody, partitionKeyValue) {
        logger.debug(`Replacing item:\n${itemBody.id}\n`);
        const { resource: item } = await client
          .database(databaseId)
          .container(containerId)
          .item(itemBody.id, partitionKeyValue)
          .replace(itemBody);
          return item;
      }
      return _replaceFamilyItem_ (databaseId, containerId, itemBody, partitionKeyValue);

    },

    getFamilyItem (databaseId, containerId, itemId, itemPartitionKey) {
      let gateway = this;
      let client = gateway.getClient();
      async function _getFamilyItem_ (databaseId, containerId, itemId, itemPartitionKey) {
        console.log ({databaseId:databaseId, containerId:containerId, itemId:itemId, itemPartitionKey:itemPartitionKey});
        const { resource: item } = await client
          .database(databaseId)
          .container(containerId).item(itemId, itemPartitionKey).read();
          return item;
      }
      return _getFamilyItem_ (databaseId, containerId, itemId, itemPartitionKey);
    },

    getFamilyItems (databaseId, containerId) {
      let gateway = this;
      let client = gateway.getClient();
      async function _getFamilyItem_ (databaseId, containerId) {
        const { resources: items } = await client
          .database(databaseId)
          .container(containerId)
          .items
          .readAll().fetchAll();
          return items;
      }
      return _getFamilyItem_ (databaseId, containerId);
    },

    deleteQueryContainer (databaseId, containerId, partitionKeyName, query, params) {
      let gateway = this;
      let client = gateway.getClient();
      /**
       * Query the container using SQL and then DELETE each item of the query
       */
      async function _deleteQueryContainer_(databaseId, containerId, partitionKeyName, query, params) {
        logger.debug(`Querying container to delete:\n${containerId}`);

        // query to return all children in a family
        // Including the partition key value of country in the WHERE filter results in a more efficient query
        const querySpec = {
          query: query
        };
        if (typeof params !== "undefined"){
          querySpec.parameters = params;
        }

        const { resources: results } = await client
          .database(databaseId)
          .container(containerId)
          .items.query(querySpec)
          .fetchAll();
        return Promise.all(results.map((item)=> {
          return new Promise ((resolve, reject)=> {
            async function __delete__ (databaseId, containerId, item, partitionKeyName) {
              let res = await client
                .database(databaseId)
                .container(containerId).item(item.id, item[partitionKeyName]).delete();
              return res;
            }
            return __delete__(databaseId, containerId, item, partitionKeyName);
          });
        }));
      }
      return _deleteQueryContainer_(databaseId, containerId, partitionKeyName, query, params);
    },

    deleteFamilyItem (databaseId, containerId, itemBody) {
      let gateway = this;
      let client = gateway.getClient();
      /**
       * Delete the item by ID.
       */
      async function _deleteFamilyItem_(databaseId, containerId, itemBody) {
        await client
          .database(databaseId)
          .container(containerId)
          .item(itemBody.id, itemBody.partitionKey)
          .delete(itemBody);
        logger.debug(`Deleted item:\n${itemBody.id}\n`);
      }
      return _deleteFamilyItem_(databaseId, containerId, itemBody);
    }

  })

]);
