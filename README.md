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
let seedNodes = ['rabbit1', 'rabbit2', 'rabbit3'];
rabbitHelper.selectRabbit(seedNodes, 'publisher', (selectedNode) => {
  // Do stuff with selectedNode
});
rabbitHelper.selectRabbit(seedNodes, 'subscriber', (selectedNode) => {
  // Do stuff with selectedNode
});
```
