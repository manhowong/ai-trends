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

  // Available actions

  // --- Navigate down

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

  // --- Navigate up

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

  // --- Mobile hint bubble (first tap on mobile)
  
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

  // Determine if an event is a cursor OR touch event
  
  function isTouchEvent(event) {
    // Dig through the ECharts layers to find the native event
    const sourceEvent = event?.event?.event || event?.event || event;
    // Check for PointerEvents (modern) OR TouchEvents (legacy/specific mobile)
    const isPointerTouch = sourceEvent?.pointerType === 'touch';
    const isStandardTouch = !!(sourceEvent?.touches || sourceEvent?.targetTouches);
    return isPointerTouch || isStandardTouch;
  }

  // Map actions to events, grouped by cursor OR touch events

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

  // Detect cursor events and trigger actions

  // --- Hover on node (highlight node)
  echart.on('mouseover', event => {
    if (event.dataType === 'node' && !isTouchEvent(event)) {
      cursorActions.onNodeHover(event.data.id);
    }
  });

  // --- Move away from node (clear highlight)
  echart.on('mouseout', event => {
    if (event.dataType === 'node' && !isTouchEvent(event)) {
      cursorActions.onNodeLeave();
    }
  });
  
  // --- Click on node (navigate down 1 level)
  echart.on('click', event => {
    if (event.dataType === 'node' && !isTouchEvent(event)) {
      cursorActions.onNodeClick(event.data);
    }
  });

  // --- Double click on canvas (navigate up 1 level)
  echart.getZr().on('dblclick', event => {
    if (!event.target && !isTouchEvent(event)) {
      cursorActions.onCanvasDblClick();
    }
  });

  // Detect touch events and trigger actions

  // --- Tap on node
  echart.on('click', event => {
    if (event.dataType === 'node' && isTouchEvent(event)) {
      showMobileHint();

      if (state.hoveredNode !== event.data.id) {
        // Tap on node first time, hightlight it
        touchActions.onNodeFirstTap(event.data.id);
      } else {
        // Tap on same node again, navigate down
        touchActions.onNodeSecondTap(event.data);
      }
    }
  });

  // --- Long-press anywhere (navigate up 1 level)
  let pressTimer = 0;
  let isLongPress = false;
  echart.getZr().on('mousedown', () => {
    pressTimer = setTimeout(() => {
      touchActions.onCanvasLongPress();
      isLongPress = true;
    }, 600);
  });

  // --- Tap anywhere besides nodes, clear hover
  //     To detect canvas events, we need to listen to both the chart events and 
  //     the chart container events. This is because echart.on() does not detect 
  //     canvas directly, so we use the chart events to filter the chart container events.
  // ------ 1. Listen to chart events
  let nodeClicked = false;
  echart.on('click', event => {
    nodeClicked = event.dataType === 'node';
  });
  // ------ 2. Listen to chart container events
  document.getElementById('chart-wrapper')?.addEventListener('click', event => {
    if (!nodeClicked && isTouchEvent(event)) {
      touchActions.onCanvasTap(); // Tap elsewhere
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
