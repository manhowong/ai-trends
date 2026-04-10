export const L1_NODE_LABEL = 'Area';
export const L1_LABEL = 'Areas';
export const L2_NODE_LABEL = 'Topic';
export const L2_LABEL = 'Topics';

export const SORT_LABELS = {
  volume: '# articles',
  hotness: 'hotness',
  edges_all: '# all links',
  edges_inter: '# inter-area links',
  edges_intra: '# intra-area links',
};

export const INSTRUCTIONS_TITLE = 'How to Use';
export const FREQUENT_TERMS_TITLE = 'Frequent Terms';
export const DEVELOPMENT_TEXT = 'In development';
export const INSUFFICIENT_DATA_TEXT = 'Insufficient data.';
export const NO_RELEVANT_NODES_TEXT = 'No topics found with current settings.';
export const INSTRUCTIONS_HTML = `
  <div id="instructions">

    <span><i>Go down a level</i></span>
    <ul class="noBullet-list">
      <li>Desktop: <b>Click</b> on a node.</li>
      <li>Mobile: <b>Tap</b> a node <b>twice</b>.</li>
    </ul>

    <span><i>Go up a level</i></span>
    <ul class="noBullet-list">
      <li>Desktop: <b>Double-click on empty space</b>.</li>
      <li>Mobile: <b>Long-press anywhere</b>.</li>
    </ul>

  </div>`;

export const LEGEND_HTML = `
  <div id="legend-block">

    <p><b>Article count</b> <br/> Shown after node name</p>
    <p>
        <b>Node size</b> <br/> Scales with article count (normalized) 
        <help-icon role="button" data-help="documentation" data-help-section="node-size"></help-icon>
    </p>
    <p>
        <b>Link width</b> <br/> Scales with relevance (DSC) 
        <help-icon role="button" data-help="documentation" data-help-section="links-and-relevance-dsc"></help-icon>
    </p>
    
    <p>
        <b>Node color</b> <br/>
        Direction of <i>Topic Hotness</i> (Period-to-Period* change in share of total articles):
        <help-icon role="button" data-help="documentation" data-help-section="topic-hotness"></help-icon>
        <div id="legend-item">
            <span id="legend-dot" style="background:var(--trend-up)"></span>
            Heating up ( &ge; +20% )
        </div>

        <div id="legend-item">
            <span id="legend-dot" style="background:var(--trend-down)"></span>
            Cooling off  ( &le; &minus;20% )
        </div>
        
        <div id="legend-item">
            <span id="legend-dot" style="background:var(--trend-flat)"></span>
            No trends detected
        </div>

        <div id="legend-note">
            *Select <b>TWO</b> time points to view Topic Hotness.
        </div>
    </p>

    <p>
        <b>Area vs. Topic nodes</b> <br/>
        Topics are grouped into research areas: 
        Each <b>area node</b> is an aggregate* of its child <b>topic nodes</b>. <br/>
        <b>Links</b> between area nodes are aggregates* of links between topic nodes.

        <div id="legend-note">
            *Filtering data at topic level <b>affects</b> area nodes.
        </div>
    
    </p>

  </div>`;
