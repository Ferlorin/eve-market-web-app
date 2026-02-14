# EVE Online Market Analysis PoC - Requirements

## Project Overview

A proof-of-concept application for analyzing market opportunities in EVE Online by comparing buy and sell orders across different markets/stations to identify profitable trading opportunities.

## Project Goals

- **Initial Target:** Windows desktop application (PoC)
- **Future Goal:** Web application
- **Distribution:** Open source via GitHub for public use

## Core Requirements

### 1. Data Source

- **API:** EVE Online ESI (EVE Swagger Interface)
- **Constraint:** Must NOT interfere with the EVE Online game client (bannable offense)
- **Data Scope:** Public stations only
- **API Limitations:** Must respect rate limits and caching requirements

### 2. Market Selection

- Users can select/filter **2 markets** (regions/stations) for comparison
- Calculate ROI between the selected markets
- Focus on inter-market trading opportunities

### 3. Data Display

#### Required Fields
- **Station Name** (for both buy and sell locations)
- **Item Name**
- **Sell Price** (at market A)
- **Buy Price** (at market B)
- **Quantity** (available for trade)
- **ROI** (Return on Investment percentage/profit margin)

#### Display Features
- **No Item Filtering:** Show all items with trading opportunities
- **Default Sort:** ROI descending (highest profit first)
- **Custom Sorting:** Allow users to sort by any column
- **Pagination:** Handle large datasets with pagination

### 4. Technical Constraints

#### Must Have
- Windows compatibility (initial PoC)
- API-only interaction (no game client interference)
- GitHub hosting capability
- Clear path to web application migration

#### Should Consider
- ESI API rate limiting
- Data caching strategy to minimize API calls
- Responsive/clean UI for data visualization
- Error handling for API failures
- Documentation for contributors

### 5. Non-Functional Requirements

- **Performance:** Fast data retrieval and calculation
- **Usability:** Simple interface for market selection and data viewing
- **Maintainability:** Clean code structure for future web migration
- **Open Source:** MIT or similar permissive license for GitHub distribution

## Open Questions

1. **Technology Stack:** Language, framework, and libraries (TBD)
2. **Architecture:** Monolith vs. separated backend/frontend (considering web migration)
3. **Data Storage:** In-memory vs. local database vs. cache-only
4. **Update Frequency:** Real-time, periodic polling, or manual refresh
5. **Scope:** Single region pairs or multi-region analysis

## Success Criteria

- Successfully fetches market data from EVE Online ESI API
- Accurately calculates ROI between two selected markets
- Displays sortable, paginated results
- Respects API rate limits
- Runs on Windows without issues
- Code is structured for easy web application conversion

## Out of Scope (for PoC)

- User authentication
- Historical data tracking
- Automated trading execution
- Mobile application
- Complex analytics/charting
