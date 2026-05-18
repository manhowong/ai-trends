# AI / ML Trend Explorer

### **[ Ongoing Project ]**

## Project Overview

Existing tools either operate at the paper level (Semantic Scholar, Connected Papers) or use unsupervised topic discovery (LDA, BERTopic) that produces *unlabelled, temporally unstable clusters* unsuitable for consistent trend tracking. 

The goal of this project is to develop a taxonomy-driven semantic classification framework that enables consistent, long-term trend tracking across the arXiv corpus. To achieve this, the project adopts the following approaches:

- **Semantic classification** over a stable, human-validated taxonomy: topics are consistently defined across time periods
- **Graded topic assignment** rather than hard single-label classification, preserving the cross-disciplinary nature of modern research
- **Trend signals based on topic share**, not raw volume: robust to the overall growth of the arXiv corpus
- **Co-occurrence graph with normalized edge weights (DSC)**: reveals the relational structure of the field, not just a ranked list of topics

## Documentation

See [Documentation](./docs/documentation.md).

## Dashboard

An interactive graph of AI/ML research trends derived from arXiv article statistics. Topics are grouped into categories, connected by co-occurrence edges (relevance measured by DSC), and colour-coded by trend direction (heating up / cooling off / no trends detected).

**Dashboard links:**
- [GitHub Page](https://manhowong.github.io/ai-trends/)
- [Mirror Page](https://explore-ai-trends.netlify.app/)