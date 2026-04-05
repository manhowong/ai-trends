export const L1_NODE_LABEL = 'Category';
export const L1_LABEL = 'Categories';
export const L2_NODE_LABEL = 'Topic';
export const L2_LABEL = 'Topics';

export const SORT_LABELS = {
  volume: '# articles',
  hotness: 'hotness',
  links: '# links',
};

export const INSTRUCTIONS_TITLE = 'How to Use';
export const FREQUENT_TERMS_TITLE = 'Frequent Terms';
export const DEVELOPMENT_TEXT = 'In development';
export const INSUFFICIENT_DATA_TEXT = 'Insufficient data.';
export const NO_RELEVANT_NODES_TEXT = 'No relevant topics found in selected period.';
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
        You can also go to a node in <b>this panel</b> or by <b>search</b>: <br /> 
        Press <span class="mockKbd">Ctrl</span> + <span class="mockKbd">K</span> or 
        "Go to ${L2_LABEL}" in
        <span class="mockToggle">
          <span class="mock-hamburger-icon">OPTIONS</span>
        </span>
    </span>

    <span>
      To see <b>trends</b>, set a range ≥ 2 months in 
      <span class="mockToggle">
        <span class="mock-hamburger-icon">OPTIONS</span>
      </span>
    </span>
  </div>`;
