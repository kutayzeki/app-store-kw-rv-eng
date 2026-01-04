# App Store Keyword Research & ASO Analysis Tool

## Background

In early June 2025, Apple changed their approach to keyword analysis by expanding beyond traditional keyword fields to also analyze all visible metadata including app descriptions and screenshots. This shift means that keywords are now extracted from these visual and textual elements as well.

This tool addresses this new reality by extracting app metadata (descriptions, screenshots), converting it to relevant keywords through LLMs, and then performing traffic and difficulty analysis on those keywords.

## What This Script Does

This tool automates the process of App Store keyword research and ASO (App Store Optimization) analysis by:

1. **Scraping App Data**: Fetches app information (title, description, screenshots) from the App Store using an app ID
2. **Finding Similar Apps**: Retrieves data for the top 3 similar apps to expand keyword research
3. **AI-Powered Keyword Generation**: Uses Claude AI to analyze app screenshots and metadata to generate relevant search keywords
4. **ASO Analysis**: Evaluates 5 randomly selected keywords using ASO metrics (traffic and difficulty scores)

## Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

## How to Run

```bash
node main.js <app_id>
```

**Example:**
```bash
node main.js 1294015297
```

Where `1294015297` is the App Store track ID (the numeric ID found in App Store URLs).

## Technologies Used

- **[app-store-scraper](https://github.com/facundoolano/app-store-scraper)**: For scraping App Store data and finding similar apps
- **[ASO-V2](https://github.com/bambolee-digital/aso-v2)**: For analyzing keyword traffic and difficulty metrics
- **[Gemini 1.5 Flash](https://ai.google.dev/)**: For AI-powered keyword generation from app screenshots and metadata
- **Node.js**: Runtime environment

## Output

The script provides:
- **Console Output**: Real-time progress with incremental saves
- **Progressive JSON**: Results saved after each keyword (resumable)
- **Final JSON**: Complete analysis data
- **Summary Text File**: Human-readable report with recommendations

### Saved Files
- `results/{AppName}_progressive.json` - **Incremental saves** (updated after each keyword)
- `results/{AppName}_progressive_final.json` - Complete final results
- `results/{AppName}_progressive_summary.txt` - Business-ready report

### Resumable Analysis
If the analysis is interrupted, restart the same command - it will resume from where it left off by reading the progressive save file.

### Analysis Results Include:
- App data for main app and 7 similar apps (expanded from 3)
- AI-generated keywords from app content + competitor analysis
- App Store autocomplete suggestions (proven user searches)
- ASO analysis for ALL keywords (not random samples)
- Opportunity scores ranking keywords by value
- Strategic recommendations (excellent/good/consider/challenging/avoid)

## Important Notes

### This is a Proof of Concept

This tool serves as a proof of concept for automated App Store keyword research. If you're interested in bringing this to the next level for production use, you're very much encouraged to do so!

### Cost Considerations

**⚠️ Note on AI Costs**: This script uses Claude Sonnet 4, which can be expensive for large-scale usage. For production or frequent use, consider switching to more cost-effective alternatives like **Gemini**.

## License

This project is open source and available under the MIT License.