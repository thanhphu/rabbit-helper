# rabbit-helper
RabbitMQ node selection helper.

Suppose you have a rabbitMQ cluster. Which node to connect to? rabbit-helper will pick one for you. It will explore the cluster from the seed nodes you give, then select one node with the least amount of connection, effectively acheiving load balancing effect without a load balancer!

# Features
* RabbitMQ node discovery
* Smart node selection based on number of connections
* Separate selection algorithm for publishers and subscribers
* Node info persistence. Even if all seed nodes are dead, if other nodes were visible at one point, it will use those alive nodes!

# Usage
```bash
pnpm i rabbit-helper --save
```

```js
const rabbitHelper = require('rabbit-helper');
let seedNodes = ['rabbit1', 'rabbit2'];
// Will also select rabbit3, 4, 5 etc. if they are up and connected to the cluster at the time
rabbitHelper.selectRabbit(seedNodes, 'publisher', (selectedNode) => {
  // Do stuff with selectedNode
});
rabbitHelper.selectRabbit(seedNodes, 'subscriber', (selectedNode) => {
  // Do stuff with selectedNode
});
rabbitHelper.selectRabbits(seedNodes, 'publisher', (selectedNodes) => {
  // selectedNodes is array of nodes sorted by connection prority (best one first)
});
```

## Assumption
* Publishers use non-durable queues, connections will be counted by `number of queues`
* Subscribers use durable queues, connections will be counted by `total number of connection on node - number of non-durable queues`