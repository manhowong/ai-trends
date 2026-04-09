export const L1_NODE_LABEL = 'Area';
export const L1_LABEL = 'Areas';
export const L2_NODE_LABEL = 'Topic';
export const L2_LABEL = 'Topics';

export const SORT_LABELS = {
  volume: '# articles',
  hotness: 'hotness',
  edges_all: '# all links',
  edges_cross: '# cross-area links',
  edges_intra: '# intra-area links',
};

export const INSTRUCTIONS_TITLE = 'How to Use';
export const FREQUENT_TERMS_TITLE = 'Frequent Terms';
export const DEVELOPMENT_TEXT = 'In development';
export const INSUFFICIENT_DATA_TEXT = 'Insufficient data.';
export const NO_RELEVANT_NODES_TEXT = 'No topics found with current settings.';
export const INSTRUCTIONS_HTML = `
  <div id="instructions">
    <span><i>Desktop</i></span>
    <ul class="noBullet-list">
      <li><b>Click</b> a node to go down a level.</li>
      <li><b>Double-click on empty space</b> to go up a level.</li>
    </ul>

    <span><i>Mobile</i></span>
    <ul class="noBullet-list">
      <li><b>Tap</b> a node <b>twice</b> to go down a level.</li>
      <li><b>Long-press anywhere</b> to go up a level.</li>
    </ul>

    <span>
        You can also click/tap on a node in <b>this panel</b>.<br />
    </span>

    <span>
        To <b>search</b>, press "Find Topics" or 
        <span class="mockKbd">Ctrl</span> + <span class="mockKbd">K</span>
    </span>

    <span>
      To see <b>trends</b>, set a range ≥ 2 months in 
      <span class="mockToggle">
        <span class="mock-hamburger-icon">CONTROL</span>
      </span>
    </span>
  </div>`;

export const LEGEND_HTML = `
  <div id="legend-block">

    <p><b>Article count</b>: <br/> Shown after node name</p>
    <p><b>Node size</b>: <br/> Scales with article count (normalized)</p>
    <p><b>Link width</b>: <br/> Scales with relevance (Dice-Sørensen Coefficient)</p>
    
    <p>
        <b>Node color</b>: <br/>
        Direction of <i>Hotness Score</i> (Period-to-Period change in share of total articles):
        <div id="legend-item">
            <span id="legend-dot" style="background:var(--trend-up)"></span>
            Heating up ( > +20% )
        </div>

        <div id="legend-item">
            <span id="legend-dot" style="background:var(--trend-down)"></span>
            Cooling off  ( < &minus;20% )
        </div>
        
        <div id="legend-item">
            <span id="legend-dot" style="background:var(--trend-flat)"></span>
            No trends detected
        </div>

        <span id="legend-note">
            *Hotness score requires <b>TWO</b> time points.
        </span>
    </p>

    <p>
        <b>Area vs. Topic nodes</b>: <br/>
        An area node is an aggregate of its child topic nodes. Links between area nodes are aggregates of links between topic nodes.
    </p>

  </div>`;
