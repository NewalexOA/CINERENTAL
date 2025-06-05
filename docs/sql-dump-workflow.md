# SQL Dump Workflow

## Overview

Automated system for extracting data from SQL dumps for use in development. The script automatically finds SQL files in the `backend/scripts/` folder and uses the first found file by default.

## Quick Start

### 1. Place your SQL dump in the scripts folder

```bash
# Copy your SQL dump to the scripts directory
cp /path/to/your/backup.sql backend/scripts/
```

### 2. Run data extraction

```bash
# Automatic search and use of the first found SQL file
cd backend/scripts/
chmod +x extract_from_sql_dump.sh
./extract_from_sql_dump.sh
```

### 3. Use extracted data

```bash
# Data will be automatically saved to extended_data.json
python backend/scripts/seed_data.py --extended-data
```

## Detailed Description

### Automatic SQL File Discovery

The `extract_from_sql_dump.sh` script now supports:

- **Automatically searching for *.sql files** in the `backend/scripts/` folder
- **Using the first found file** (alphabetical sorting)
- **Displaying list of available files** with sizes and auto-selected marker
- **Accepting explicitly specified file** as command line argument

### Usage Options

```bash
# 1. Automatic search (recommended)
./extract_from_sql_dump.sh

# 2. Specify concrete file in the same folder
./extract_from_sql_dump.sh backup_new.sql

# 3. Specify file from any location
./extract_from_sql_dump.sh /path/to/external/backup.sql
```

### Sample Output

```bash
[INFO] === Extended Data Extraction from SQL Dump ===
[INFO] Available SQL files in backend/scripts/:
  1. backup_production_20250605_190025.sql (228KB) <- [AUTO-SELECTED]
  2. backup_test_20250607_120030.sql (45KB)

[INFO] Auto-detected SQL dump: backend/scripts/backup_production_20250605_190025.sql
[INFO] Using SQL dump: backup_production_20250605_190025.sql (228KB)
[INFO] Temporary database: temp_data_extract_1735389420
[INFO] Port: 5433
```

## Technical Details

### File Discovery Algorithm

1. **Search:** `find backend/scripts/ -name "*.sql" -type f | sort`
2. **Sorting:** Alphabetical (ensures deterministic selection)
3. **Selection:** First file from sorted list
4. **Fallback:** If no files found - error with instruction

### Workflow Structure

```text
SQL dump → Temp DB → Python extractor → JSON → Development system
    ↓         ↓            ↓             ↓           ↓
 *.sql file → PostgreSQL → extract_extended_data.py → extended_data.json → seed_data.py
```

### Security

- **Temporary DB:** Created in Docker container on separate port (5433)
- **Auto-cleanup:** Container is automatically removed after completion
- **Isolation:** Does not affect main development database

## Advantages of New Approach

1. **Ease of use:** Simply copy SQL file and run script
2. **Flexibility:** Supports both auto-discovery and explicit file specification
3. **Informativeness:** Shows all available files with sizes
4. **Deterministic:** Always selects the same file with identical file set
5. **Backward compatibility:** Preserves ability to explicitly specify file

## Troubleshooting

### No SQL files in folder

```bash
[ERROR] No SQL files found in backend/scripts/ directory
Please provide SQL dump file path as argument:
Usage: ./extract_from_sql_dump.sh [path_to_sql_dump]
```

**Solution:** Copy SQL dump to `backend/scripts/` or specify file path

### File found but doesn't exist

```bash
[ERROR] SQL dump file not found: backend/scripts/backup.sql
```

**Solution:** Check file access permissions and existence

### Docker not running

```bash
[ERROR] Docker is not running. Please start Docker and try again.
```

**Solution:** Start Docker Desktop or systemctl start docker

## See Also

- `backend/scripts/extract_extended_data.py` - Python script for data extraction
- `backend/scripts/seed_data.py` - Load data into development database
- `docker/start.sh` - Automatic usage of extended_data.json
