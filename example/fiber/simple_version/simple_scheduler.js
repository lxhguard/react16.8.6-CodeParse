// 遍历得到Fiber树

let example_Fiber_root = require('./ReactFiber');

// 下一个执行单元，初始化为空
let nextUnitOfWork = null;

/**
 * 在单链表的当前节点中，获取下一个节点
 * @desc 每个执行单元由 beginWork() 和 completeUnitOfWork() 构成
 * @param {Fiber} workInProgress 当前Fiber节点
 * @return {Fiber} next 返回下一个节点的单链表树结构
 */
function performUnitOfWork(workInProgress) {
  const current = workInProgress.alternate;

  // 当前传入参数（Fiber Node）的 下一个节点
  let next = beginWork(current, workInProgress, nextRenderExpirationTime);

  if (next === null) { // 如果没有子节点，执行当前任务单元
    next = completeUnitOfWork(workInProgress);
  }

  return next;
}

/**
 * 循环执行任务
 * 深度优先遍历 构建FIber树 入口
 * @param {boolean} isYieldy react是否要让出时间片
 */
function workLoop(isYieldy) {
  while (nextUnitOfWork !== null){
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

}

/**
 * 构建effectlist，（返回兄弟节点）
 * @desc 没有子节点时，遍历兄弟节点作为下一个执行单元。（返回兄弟节点）
 *        兄弟节点执行结束，向上回溯至根节点。
 *        向上回溯过程中，收集所有diff(后序遍历收集有副作用的Fiber，组成effectlist)，准备进入commit阶段。
 * @param {Fiber} workInProgress 当前Fiber节点
 * @return {Fiber|null} next|null  返回当前Fiber节点的兄弟节点
 *
 * completeWork()通过tag调用相对应的更新方法， 返回第一个子节点
 */
function completeUnitOfWork(workInProgress: Fiber): Fiber | null {
  while (true) {
    const current = workInProgress.alternate;
    // 当前节点的 父节点 和 兄弟节点
    const returnFiber = workInProgress.return;
    const siblingFiber = workInProgress.sibling;

    if ((workInProgress.effectTag & Incomplete) === NoEffect) {
      nextUnitOfWork = workInProgress;
      if (enableProfilerTimer) {
        if (workInProgress.mode & ProfileMode) {
          startProfilerTimer(workInProgress);
        }
        nextUnitOfWork = completeWork(
          current,
          workInProgress,
          nextRenderExpirationTime,
        );
        if (workInProgress.mode & ProfileMode) {
          // Update render duration assuming we didn't error.
          stopProfilerTimerIfRunningAndRecordDelta(workInProgress, false);
        }
      } else {
        nextUnitOfWork = completeWork(
          current,
          workInProgress,
          nextRenderExpirationTime,
        );
      }
      stopWorkTimer(workInProgress);
      resetChildExpirationTime(workInProgress, nextRenderExpirationTime);

      if (nextUnitOfWork !== null) {
        // Completing this fiber spawned new work. Work on that next.
        return nextUnitOfWork;
      }

      // 下面的两个if是构成effectlist的关键：从下往上挂载。
      // （1）把当前Fiber节点的子节点effect挂在到当前Fiber的父节点。当前Fiber相当于一个中间变量，沟通其父亲和其儿子。
      if (
        returnFiber !== null &&
        // Do not append effects to parents if a sibling failed to complete
        (returnFiber.effectTag & Incomplete) === NoEffect
      ) {
        // Append all the effects of the subtree and this fiber onto the effect
        // list of the parent. The completion order of the children affects the
        // side-effect order.
        if (returnFiber.firstEffect === null) {
          returnFiber.firstEffect = workInProgress.firstEffect;
        }
        if (workInProgress.lastEffect !== null) {
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = workInProgress.firstEffect;
          }
          returnFiber.lastEffect = workInProgress.lastEffect;
        }
        // 当前Fiber节点的副作用标识位
        const effectTag = workInProgress.effectTag;
        // （2）把当前Fiber节点的effect挂在到其父节点上
        if (effectTag > PerformedWork) { // 有副作用，收集effect
          if (returnFiber.lastEffect !== null) { // 如果父节点的最后副作用指针有值
            // 则effectlist中间部分使用nextEffect指针进行连接
            returnFiber.lastEffect.nextEffect = workInProgress;
          } else {
            // 这里
            returnFiber.firstEffect = workInProgress;
          }
          // 这里
          returnFiber.lastEffect = workInProgress;
        }
      }


      if (siblingFiber !== null) {
        // If there is more work to do in this returnFiber, do that next.
        return siblingFiber;
      } else if (returnFiber !== null) {
        // If there's no more work in this returnFiber. Complete the returnFiber.
        workInProgress = returnFiber;
        continue;
      } else {
        // We've reached the root.
        return null;
      }
    } else { // 无副作用
      if (enableProfilerTimer && workInProgress.mode & ProfileMode) {
        // Record the render duration for the fiber that errored.
        stopProfilerTimerIfRunningAndRecordDelta(workInProgress, false);

        // Include the time spent working on failed children before continuing.
        let actualDuration = workInProgress.actualDuration;
        let child = workInProgress.child;
        while (child !== null) {
          actualDuration += child.actualDuration;
          child = child.sibling;
        }
        workInProgress.actualDuration = actualDuration;
      }

      // This fiber did not complete because something threw. Pop values off
      // the stack without entering the complete phase. If this is a boundary,
      // capture values if possible.
      const next = unwindWork(workInProgress, nextRenderExpirationTime);
      // Because this fiber did not complete, don't reset its expiration time.
      if (workInProgress.effectTag & DidCapture) {
        // Restarting an error boundary
        stopFailedWorkTimer(workInProgress);
      } else {
        stopWorkTimer(workInProgress);
      }


      if (next !== null) {
        stopWorkTimer(workInProgress);

        // If completing this work spawned new work, do that next. We'll come
        // back here again.
        // Since we're restarting, remove anything that is not a host effect
        // from the effect tag.
        next.effectTag &= HostEffectMask;
        return next;
      }

      if (returnFiber !== null) {
        // Mark the parent fiber as incomplete and clear its effect list.
        returnFiber.firstEffect = returnFiber.lastEffect = null;
        returnFiber.effectTag |= Incomplete;
      }

      if (siblingFiber !== null) {
        // If there is more work to do in this returnFiber, do that next.
        return siblingFiber;
      } else if (returnFiber !== null) {
        // If there's no more work in this returnFiber. Complete the returnFiber.
        workInProgress = returnFiber;
        continue;
      } else {
        return null;
      }
    }
  }

  return null;
}
