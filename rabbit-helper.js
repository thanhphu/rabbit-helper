// Selects rabbitMQ with least connection
'use strict';
require('dotenv').config();
const _ = require('lodash');
const request = require('request');
const async = require('async');
const storage = require('node-persist');

const rabbitUsername = process.env.RABBIT_USERNAME || 'guest';
const rabbitPassword = process.env.RABBIT_PASSWORD || 'guest';

function extractHostName(longNodeName) {
  return longNodeName.split('@')[1];
}

function anyItem(arr) {
  return arr[_.random(0, arr.length - 1)];
}

function selectNode(hosts, queueInfoList, nodeInfoList, type) {
  if (_.isEmpty(nodeInfoList)) {
    // Nothing from API, connects to a random node
    return (anyItem(hosts));
  } else if (_.isEmpty(queueInfoList)) {
    let nodeNames = _.uniq(_.map(nodeInfoList, extractHostName));
    return (anyItem(nodeNames));
  } else {
    // List of all alive nodes
    // nodesCount example: ['rabbit@rabbit1', 'rabbit@rabbit2', 'rabbit@rabbit3']
    let nodeNames = _.uniq(_.map(nodeInfoList, node => node.name));

    // Persist list of nodes for next time
    storage.setItem('hosts', _.map(nodeNames, extractHostName));

    if (type === 'publisher') {
      // Mosca makes non-durable queues, keep durable queues
      _.remove(queueInfoList, node => node.durable === true);
    } else {
      // We use durable queues in consumers
      _.remove(queueInfoList, node => node.durable === false);
    }
    // queueCount example: Object {rabbit@rabbit1: 2, rabbit@rabbit2: 1, rabbit@rabbit3: 3}
    let queueCount = _.countBy(queueInfoList, node => node.node);
    // Add nodes with zero queues
    _.forEach(nodeNames, nodeName => {
      if (!queueCount[nodeName]) {
        queueCount[nodeName] = 0;
      }
    });

    let queueCountArr = _.map(queueCount, (count, name) => {
      return { name, count };
    });
    let leastConnectedNode = _.sortBy(queueCountArr, 'count')[0].name;

    let leastConnectedNodeName = extractHostName(leastConnectedNode);
    return leastConnectedNodeName;
  }
}

function callApi(url, host, cb) {
  request({
    url: url,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      cb(null, body);
    } else {
      cb(error, null);
    }
  });
}

function callQueueApi(host, cb) {
  const url = `http://${rabbitUsername}:${rabbitPassword}@${host}:15672/api/queues`;
  callApi(url, host, cb);
}

function callNodesApi(host, cb) {
  const url = `http://${rabbitUsername}:${rabbitPassword}@${host}:15672/api/nodes`;
  callApi(url, host, cb);
}

function getQueueAndNodeInfo(configHosts, type, onceSuccessCb, failureCb) {
  storage.init().then(() => {
    storage.getItem('hosts').then((savedHosts) => {
      let mergedHosts = _.uniq(_.concat(savedHosts, configHosts));
      async.some(mergedHosts, (host, someCallback) => {
        async.waterfall([
          (callback) => {
            callQueueApi(host, (err, queueInfoList) => callback(err, queueInfoList));
          },
          (queueInfoList, callback) => {
            callNodesApi(host, (err, nodeInfoList) => callback(err, queueInfoList, nodeInfoList));
          },
          (queueInfoList, nodeInfoList, callback) => {
            let selectedHost = selectNode(configHosts, queueInfoList, nodeInfoList, type);
            onceSuccessCb(selectedHost);
            callback(null);
          }
        ], (err) => {
          someCallback(null, !err);
        });
      }, (err, result) => {
        if ((err || !result) && failureCb) {
          failureCb(err);
        }
      });    
    });
  });
  
}

/**
 * hosts: array of hosts to query from
 * type: type of least connection to select, available types:
 *    'publisher': when called from mosca
 *    'subscriber': when called from collector
 * success: connection callback, takes one parameter - hostname of selected node
 */
module.exports.selectRabbit = function (hosts, type, successCb, failureCb) {
  let onceSuccessCb = _.once(successCb);
  getQueueAndNodeInfo(hosts, type, onceSuccessCb, failureCb);
};