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

### 过程剖析

在createElement()生成虚拟DOM树后，在页面首次渲染或者页面更新时，会有<span style="color:red;">渲染</span>和<span style="color:red;">调度</span>两个阶段:<br/>
(1)render():这个阶段不进行真实DOM渲染。该阶段可中断。这个阶段进行两个事情：1.先序遍历根据虚拟DOM生成Fiber树 2.收集effectlist<br/>
(2)commit():这个阶段进行真实DOM的更新创建。该阶段不可中断。<br/>

> render()阶段是调用ReactBatch.prototype.render(定义在209行)，生成一个根Fiber节点（里面的props.children属性包含虚拟DOM树），调用getPublicRootInstance。页面首次渲染调用requestIdleCallback，传入参数workLoop进行任务循环执行。workLoop是通过while循环让nextUnitOfWork指针不断向下移动，从而构建Fiber单链表。指针移动寻找下一个指针时，调用了performUnitOfWork()执行当前任务单元。<br/><br/>
> 在该函数中，一个任务单元的执行分为两部分：beginWork()和completeUnitOfWork()。因为虚拟DOM节点与Fiber节点是一一对应的。<br/><br/>
> beginWork(current, workInProgress,)以构建当前Fiber节点的子节点为主线 构建Fiber单链表结构，其中通过Fiber.tag调用不同的更新方法，不同的更新方法会做两件事：创建不同类型的真实DOM元素 和 子Fiber Node（注意，此处是深度优先，只生成一个VDOM的所有儿子Fiber，不涉及生成VDOM的兄弟Fiber）。创建真实DOM节点会通过if判断Fiber.stateNode是否为空来进行创建真实DOM。每次都生子Fiber即newFiber，newFiber生成之后，if会判断当前newFiber是否为当前节点workInProgress的第一个儿子，如果是则建立父子关系即workInProgress.child = newFiber，反之则建立兄弟关系，即prevSibling.sibling=newFiber。<br/><br/>
> completeUnitOfWork(workInProgress)根据当前FIber节点workInProgress收集diff，构建effectlist。因为这个是构建，能进入这个函数的一定是没有子节点的。构建effectlist过程是从下往上挂载的：根Fiber节点有两个指针firstEffect指向effectlist头节点，lastEffect指向effectlist尾节点，effectlist链表中间使用nextEffect指针连接。先挂在当前Fiber节点workInProgress的子节点到effectlist，如果当前Fiber节点存在effect则把当前FIber节点也挂入effectlist。返回当前Fiber节点的兄弟节点。
> <br/><br/>
> perform：执行

### (1) render(element,container,callback): packages/react-dom/src/client/ReactDOM.js 673行



### (2)type Fiber：packages/react-reconciler/src/ReactFiber.js

主要涉及三个属性:return, child, sibling <br/>

### (3)function workLoop(isYieldy)：packages/react-reconciler/src/ReactFiberScheduler.js

setState()或者 首次render()时，会进入workLoop，生成新的Fiber Node单链表树结构。<br/>
work可以理解为 单个执行单元（即Fiber Node） 的任务集合<br/>

<b>主要涉及函数：</b> 
- workLoop（先序遍历生成新的Fiber单链表树）：Fiber Node是work(任务)的最小执行单元。 <br/>

### (4)function beginWork(current,workInProgress,renderExpirationTime)：packages/react-reconciler/src/ReactFiberBeginWork.js

处理传入的 Fiber Node：（1）创建真实DOM （2）创建子Fiber （不包含兄弟Fiber） <br/>
生成遍历链（Fiber链式结构）：先序遍历 <br/>
