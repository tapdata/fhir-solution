# Hybrid FHIR Project
> [!NOTE]
>
> This is a combined solution based on the fork of the MongoDB GitHub repository (https://github.com/mongodb-industry-solutions/hybrid-fhir-odl).



A comprehensive FHIR R4 compliant healthcare data management system built with MongoDB backend and TapData pipelines.   Featuring advanced search capabilities and an interactive API demonstrator. This solution leverages Tapdata’s CDC data pipeline to replicate data from legacy system and transform proprietary healthcare data models into interoperable FHIR standards, enabling seamless healthcare interoperability without modifying your existing business applications. 



## 🏗️ Project Structure

```
tapdata-fhir/
├── backend/                    # Python FastAPI + MongoDB + PostgreSQL
│   ├── fhir_toolkit/          # Main application package
│   │   ├── api.py             # FastAPI endpoints (3 APIs)
│   │   ├── search_builders.py # Advanced FHIR search logic
│   │   ├── db.py              # MongoDB connection
│   │   ├── db_pg.py           # PostgreSQL connection
│   │   ├── config.py          # Configuration
│   │   ├── synth.py           # Legacy synthetic data inspection in PG
│   │   ├── transform.py       # Legacy data and FHIR model structure transformation
│   │   └── mappings.py        # FHIR resource mappings
│   ├── .venv/                 # Python virtual environment
│   └── pyproject.toml         # Python dependencies
├── frontend/                   # Next.js React application
│   ├── app/                   # Next.js app router
│   ├── components/            # React components
│   │   └── views/fhir/        # FHIR-specific views
│   │       ├── FhirOverview.jsx        # Architecture Overview
│   │       ├── FhirApiTester.jsx       # Interactive API demonstrator
│   │       ├── FhirResourceBrowser.jsx # FHIR Resource browser
│   │       └── LegacySyntheticPanel.jsx  # Legacy synthetic data UI
│   │       └── DataTransformation.jsx  # Transformation UI and Tapdata demo link
│   ├── public/fhir-config/    # FHIR search configuration
│   └── package.json           # Node dependencies
├── docs/                       # Project documentation
├── .env.local.example         # Environment template
├── start-server.sh            # Backend startup script
├── start-frontend.sh          # Frontend startup script
└── README.md                  # This file
```

## ✨ Features

**Zero-touch source systems**: Keep legacy applications untouched while exposing FHIR APIs
**Real-time sync**: CDC captures changes instantly; MongoDB stores transformed FHIR data
**Production-ready APIs**: Deploy FHIR R4-compliant REST endpoints in days, not months
**Future-proof architecture**: Add new data sources or target systems without modifying legacy code
**Schema-free flexibility**: MongoDB's document model natively supports FHIR's nested, complex, and variable-structure resources

### Data visualization

1. **Data Inspection**
   - Original data inspection (synthetic legacy data in RDBMS)
   - Data transfomation (graphical relationships from legacy data to FHIR model)
2. **FHIR R4 API** - Standards-compliant healthcare interoperability
   - Patient search (20+ parameters)
   - Encounter search (15+ parameters)
   - Accelerated and canonical search modes
   - Cross-resource queries (Patient → Encounter relationships)

### Real-time Data Transformation

This project includes an external link to Tapdata Cloud to demonstrate the real-time data transformation capabilities that are typically required to generate FHIR models.

* **Real-time CDC (Change Data Capture)**: Automatically detect and stream data changes from source systems

* **Visual data mapping**: No-code/low-code transformation designer

* **Continuous synchronization**: Keep FHIR models in sync with legacy data in real-time

* **Enterprise-grade reliability**: Built-in error handling, monitoring, and data validation

* **Scalable transformation**: Transform millions of healthcare records efficiently

  

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+

### 1. Backend Setup

```bash
# Start backend server
./start-server.sh

# Backend runs on http://localhost:3100
```

### 2. Frontend Setup

```bash
# Start frontend development server
cd frontend
npm install
cd ..
./start-frontend.sh

# Frontend runs on http://localhost:3101
```

### 3. Explore the System

Visit http://localhost:3101 and explore:

1. **Synthetic Data Tab**: Browse original relational data from PostgreSQL

2. **Data Transformation Tab**: Visualize how data is transformed to FHIR format

3. **Data Viewer Tab**: Browse the materialized view of FHIR data in MongoDB

4. **FHIR API Tab**: Execute 31+ pre-built query examples


## 🎯 Usage Examples

### Via Interactive Demonstrator (Recommended)

1. Open http://localhost:3101
2. Navigate to "Synthetic Data Tab" and check the legacy relational data
3. Navigate to "Data Transformation Tab" and check the data transformation
4. Click "view the process" button to browse the data transformation tasks and processes
5. Navigate to "FHIR API Tab"
6. Click any example button (e.g., "Female Patients")
7. Query executes automatically with results displayed

## 🏥 Healthcare Data Model

### FHIR Envelope Pattern

Resources are stored with three sections:

```json
{
  "tenant": "your-tenant",
  "resourceType": "Patient",
  "resource": { /* Standard FHIR resource */ },
  "app": { /* Application-specific data */ },
}
```

## 🌟 Key Capabilities

### MongoDB Document Capabilities

- **Single Document**: No joins, faster queries
- **Schema-Free**: Add extensions without database migration
- **Native Array Support**: Multiple identifiers, addresses, contacts stored naturally
- **Flexible Structure**: JSON like fields match FHIR model perfectly
- **Version Compatible**: Old and new FHIR versions coexist in same collection
- **Rich Type Support**: Native support for dates, nested objects, arrays

### Tapdata Data Transformation Capabilities

**Real-Time CDC**:

- Change Data Capture without business modification and source impact
- Detects changes in source PostgreSQL tables instantly
- Minimal latency between source and target updates
- Supports high-volume change streams

**Data Enrichment**:
- Add derived fields (e.g., age calculated from birthdate)
- Join data from multiple source tables
- Aggregate and summarize information

**Data Cleansing**:
- Normalize inconsistent data formats
- Remove or mask sensitive information

**Schema Flexibility**:
- Source schema can evolve without breaking pipeline
- Automatic field discovery and mapping
- Handle new tables dynamically

## 🤝 Contributing

This is a demonstration/reference implementation showing:
- FHIR R4 API design patterns
- MongoDB document design for healthcare
- Tapdata Integrated data transformation workflows
- Fast search with pre-computed indexes
- Multi-API architecture (Admin, App, FHIR)
- Interactive API exploration tools

## 📝 License

[Your License Here]

## 🙏 Acknowledgments

- Built with FastAPI, Next.js 14, and MongoDB
- Data Transformation by Tapdata
- FHIR R4 specification by HL7
- Tailwind CSS for styling
- Monaco Editor for JSON viewing
