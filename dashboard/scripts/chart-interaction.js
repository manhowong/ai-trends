/* ============================================================
   chart-interaction.js - Chart-surface event wiring
   ============================================================ */

export function initializeChartInteraction({
  echart,
  state,
  goOverview,
  focusL1Node,
  focusL2Node,
  applyHover,
  clearHover,
}) {
  function navigateDown(nodeData) {
    state.hoveredNode = null;

    if (state.currentView === 'overview' && nodeData._type === 'l1') {
      focusL1Node(nodeData._l1NodeId || nodeData.id);
      return;
    }

    if (state.currentView === 'l1' && (nodeData._type === 'l2' || nodeData._type === 'externalL2')) {
      focusL2Node(nodeData.id);
      return;
    }

    if (state.currentView === 'l2' && nodeData._type === 'connectedL2') {
      focusL2Node(nodeData.id);
    }
  }

  function navigateUp() {
    state.hoveredNode = null;

    if (state.currentView === 'l2') {
      focusL1Node(state.currentL1NodeId);
      return;
    }

    if (state.currentView === 'l1') {
      goOverview();
    }
  }

  let mobileHintTimer = 0;
  let mobileHintShown = false;

  function showMobileHint() {
    if (mobileHintShown) return;

    const hint = document.getElementById('mobile-hint');
    if (!hint) return;

    window.requestAnimationFrame(() => {
      hint.classList.add('is-visible');
    });

    mobileHintShown = true;
    clearTimeout(mobileHintTimer);
    mobileHintTimer = setTimeout(() => {
      hint.classList.remove('is-visible');
    }, 5000);
  }

  function isTouchEvent(event) {
    const sourceEvent = event?.event?.event || event?.event || event;
    const isPointerTouch = sourceEvent?.pointerType === 'touch';
    const isStandardTouch = !!(sourceEvent?.touches || sourceEvent?.targetTouches);
    return isPointerTouch || isStandardTouch;
  }

  const cursorActions = {
    onNodeHover: id => {
      state.hoveredNode = id;
      applyHover(id);
    },
    onNodeLeave: () => {
      state.hoveredNode = null;
      clearHover();
    },
    onNodeClick: nodeData => navigateDown(nodeData),
    onCanvasDblClick: () => navigateUp(),
  };

  const touchActions = {
    onNodeFirstTap: id => {
      state.hoveredNode = id;
      applyHover(id);
    },
    onNodeSecondTap: nodeData => navigateDown(nodeData),
    onCanvasTap: () => {
      state.hoveredNode = null;
      clearHover();
    },
    onCanvasLongPress: () => navigateUp(),
  };

  echart.on('mouseover', event => {
    if (event.dataType === 'node' && !isTouchEvent(event)) {
      cursorActions.onNodeHover(event.data.id);
    }
  });

  echart.on('mouseout', event => {
    if (event.dataType === 'node' && !isTouchEvent(event)) {
      cursorActions.onNodeLeave();
    }
  });

  echart.on('click', event => {
    if (event.dataType === 'node' && !isTouchEvent(event)) {
      cursorActions.onNodeClick(event.data);
    }
  });

  echart.getZr().on('dblclick', event => {
    if (!event.target && !isTouchEvent(event)) {
      cursorActions.onCanvasDblClick();
    }
  });

  echart.on('click', event => {
    if (event.dataType === 'node' && isTouchEvent(event)) {
      showMobileHint();

      if (state.hoveredNode !== event.data.id) {
        touchActions.onNodeFirstTap(event.data.id);
      } else {
        touchActions.onNodeSecondTap(event.data);
      }
    }
  });

  let pressTimer = 0;
  let isLongPress = false;

  echart.getZr().on('mousedown', () => {
    pressTimer = setTimeout(() => {
      touchActions.onCanvasLongPress();
      isLongPress = true;
    }, 600);
  });

  let nodeClicked = false;

  echart.on('click', event => {
    nodeClicked = event.dataType === 'node';
  });

  document.getElementById('chart-wrapper')?.addEventListener('click', event => {
    if (!nodeClicked && isTouchEvent(event)) {
      touchActions.onCanvasTap();
    }

    nodeClicked = false;
  });

  const cancelInteraction = () => {
    clearTimeout(pressTimer);
    isLongPress = false;
  };

  echart.getZr().on('mouseup', cancelInteraction);
  echart.getZr().on('touchend', cancelInteraction);
  echart.getZr().on('mousemove', cancelInteraction);
  echart.getZr().on('globalout', cancelInteraction);
}
