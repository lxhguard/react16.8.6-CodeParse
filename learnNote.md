# react-16.8.6 源码学习笔记

# 一.Fiber架构

## 1. 前言浅谈

### (1) 背景
React常用的渲染和更新是由<b style="color:blue;">render()</b>和<b style="color:blue;">setState()</b>触发的，主要包括了两个阶段：调度阶段(Reconciler)和渲染阶段(Renderer) <br/>
Reconciler：通过Diff算法，把【要更新的元素】放到【<span style="color:red;">更新队列</span>】<br/>
Renderer：遍历【<span style="color:red;">更新队列</span>】更新DOM元素<br/>
React的Reconciler：16.0前使用Stack，16.0后使用Fiber <br/>
### (2) Stack Reconciler会带来什么问题？
<span style="color:blue;">递归遍历</span>：Stack采用<span style="color:red;">自顶向下递归算法</span>（深度优先遍历），<span style="color:red;">不可中断</span>，一旦开始，要等待VDOM树完成才释放主线程。所以，16.0前的组件更新是<span style="color:red;">同步</span>的递归过程。随之而来的两个问题就是，更新时会阻塞页面响应（用户交互、动画等），会掉帧造成卡顿。<br/>

### (3) Fiber Reconciler为解决上述问题而诞生
<span style="color:blue;">循环遍历</span>：Fiber采用<span style="color:red;">链式结构</span>（单链表），链式结构本身可中断与恢复（解决了Stack的两个问题），再配合 requestIdleCallback API，不仅实现了任务拆分，而且可以更好的中断恢复。所以，16.0后的组件更新是<span style="color:red;">异步</span>的循环过程。
> requestIdleCallback是Facebook为了兼容所有浏览器，自己实现的polyfill。requestIdleCallback是在浏览器空闲时发生调用。

### (4) Fiber 单链表的实现
三个指针（属性）： return（指向父节点），child（指向第一个子节点），sibling（指向兄弟节点）。<br/>
Fiber Node 和 Virtual Dom Node 是一一对应的关系，Fiber树（单链表）可通过前序遍历（深度优先遍历）得到。

## 2. 源码涉及

### (1)type Fiber：packages/react-reconciler/src/ReactFiber.js

主要涉及三个属性:return, child, sibling <br/>

### (2)function workLoop(isYieldy)：packages/react-reconciler/src/ReactFiberScheduler.js

### 
