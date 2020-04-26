// 两部分组成： Fiber抽象接口 VDOM实例  Fiber实例
/**
 * @interface Fiber Node Structure
 * @desc export type Fiber = {}
 * @alias Fiber = {}
 */
Fiber = {
  // The resolved function/class/ associated with this fiber.
  type: any,

  // The Fiber to return to after finishing processing this one.
  // This is effectively the parent, but there can be multiple parents (two)
  // so this is only the parent of the thing we're currently processing.
  // It is conceptually the same as the return address of a stack frame.
  return: Fiber | null,

  // Singly Linked List Tree Structure.
  child: Fiber | null,
  sibling: Fiber | null,

  /**
   * 在workLoop的调用函数beginWork中会用到，
   * 用于区分原生元素、函数组件、 类组件、 懒加载组件等的标识位
   */
  // Tag identifying the type of fiber.
  tag: WorkTag,

  /**
   * 如果该Fiber Node是一个原生节点，
   * 则 stateNode 指向真实DOM元素。
   */
  // The local state associated with this fiber.
  stateNode: any,
}

/**
 * @name VDOM_root
 * @example 虚拟DOM树结构如下:
 *         A1
 *       /    \
 *      B1    B2
 *    /    \
 *   C1    C2
 *
 * 16.0之前对VDOM树进行遍历，不可中断
 */
let example_VDOM_root = {
    key: 'A1',
    type:'div',
    children: [
        {
            key: 'B1',
            type: 'div',
            children: [
                { key: 'C1', type:'div', children: [] },
                { key: 'C2', type:'div', children: [] },
            ]
        },
        {
            key: "B2", type: 'div', children: []
        }
    ]
}

/**
 * @name Fiber_root
 * @example Fiber链表结构如下: 单链表树结构
 *         A1 - B1 - C1 - C2 - B2
 *
 * 16.0之后对Fiber链表进行遍历，可中断可恢复
 * (对VDOM树进行前序遍历得到Fiber链表)
 */
let example_Fiber_A1 = { type: 'div', key: 'A1' };
let B1 = { type: 'div', key: 'B1', return: A1 }
let B2 = { type: 'div', key: 'B2', return: A1 }
let C1 = { type: 'div', key: 'C1', return: B1 }
let C2 = { type: 'div', key: 'C2', return: B1 }
Fiber_A1.child = B1;
B1.sibling = B2;
B1.child = C1;
C1.sibling = C2;
const example_Fiber_root = example_Fiber_A1;

module.exports = example_Fiber_root;
