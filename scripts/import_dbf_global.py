#!/usr/bin/env python3
"""
Import DBF data from Global ZIP file to PostgreSQL database.

Rules:
- id = codigoauto from DBF (no auto-generation)
- operador = tipoop for bancos table
- Ignore fields: bloqueado, flete, fletechofer
- Sanitize null values
- Native DATE format
- Insert ordered by fecha
"""

import os
import sys
import json
import zipfile
import tempfile
import shutil
from datetime import datetime, date
import psycopg2
from dbfread import DBF

DATABASE_URL = os.environ.get('DATABASE_URL')

# Tables to process and their DBF mappings
TABLES = ['parametros', 'bancos', 'administracion', 'cheques', 'cosecha', 'almacen', 'transferencias']

# Fields to ignore (lowercase)
IGNORE_FIELDS = {'bloqueado', 'flete', 'fletechofer'}

# Table-specific fields to ignore
TABLE_IGNORE_FIELDS = {
    'almacen': {'codrel'}
}

def get_connection():
    return psycopg2.connect(DATABASE_URL)

def sanitize_string(val):
    """Sanitize string value: remove NUL chars, strip whitespace, convert empty to None"""
    if val is None:
        return None
    if isinstance(val, str):
        cleaned = val.replace('\x00', '').strip()
        return cleaned if cleaned else None
    return None

def sanitize_id(val):
    """Sanitize id/codigoauto value: accepts string or numeric, returns string"""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        # Convert numeric to string, removing decimal for integers
        if isinstance(val, float) and val.is_integer():
            return str(int(val))
        return str(val)
    if isinstance(val, str):
        cleaned = val.replace('\x00', '').strip()
        return cleaned if cleaned else None
    return str(val) if val else None

def sanitize_number(val):
    """Sanitize numeric value: convert empty/invalid to 0 or None"""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        try:
            return float(val)
        except:
            return None
    return None

def sanitize_boolean(val):
    """Sanitize boolean value"""
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        val = val.strip().lower()
        if val in ('true', 't', '1', 'yes', 'si', 's'):
            return True
        if val in ('false', 'f', '0', 'no', 'n', ''):
            return False
    if isinstance(val, (int, float)):
        return bool(val)
    return None

def to_date(val):
    """Convert to native DATE format"""
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y%m%d']:
            try:
                return datetime.strptime(val, fmt).date()
            except:
                continue
        return None
    return None

def get_table_columns(conn, table_name):
    """Get column names and types for a table"""
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = %s ORDER BY ordinal_position
    """, (table_name,))
    columns = {row[0]: row[1] for row in cur.fetchall()}
    cur.close()
    return columns

def get_field_mappings(table_name):
    """Get DBF field name to table column mappings for a specific table"""
    # Common mappings (lowercase DBF -> table column)
    # Handle truncated DBF field names
    mappings = {
        'descripcio': 'descripcion',
        'unidaddepr': 'unidad',
        'personalde': 'personal',
        'comprobant': 'comprobante',
        'comproban': 'comprobante',
        'formadepag': 'formadepag',
        'unidaddeme': 'unidaddemedida',
        'abilitado': 'habilitado',
        'trans': 'transferencia',
        'cedula': 'ced_rif',
        'clase': 'tipo',
        'prop': 'propietario',
        'relaz': 'relacionado',
        'montodol': 'montodol',
        'saldoconci': 'saldo_conciliado',
        'beneficiar': 'beneficiario',
        'transferid': 'transferido',
        'contabiliz': 'contabilizado',
        'noendosabl': 'noendosable',
        # Handle possible DBF truncations for codigoauto
        'codigoaut': 'codigoauto',
    }
    
    # Table-specific mappings
    if table_name == 'bancos':
        mappings['tipoop'] = 'operador'
    elif table_name == 'almacen':
        mappings['codigoauto'] = 'codigo_auto'
        mappings['codigoaut'] = 'codigo_auto'
        mappings['unidaddeme'] = 'unidad_medida'
    
    return mappings

def get_codigoauto_columns(table_name):
    """Get the codigoauto column name for a table"""
    if table_name == 'almacen':
        return 'codigo_auto'
    return 'codigoauto'

def map_dbf_to_table(dbf_record, table_name, table_columns):
    """Map DBF record to table columns with transformations"""
    result = {}
    field_mappings = get_field_mappings(table_name)
    codigoauto_col = get_codigoauto_columns(table_name)
    codigoauto_value = None
    
    # Get table-specific ignored fields
    table_ignores = TABLE_IGNORE_FIELDS.get(table_name, set())
    
    for dbf_field, value in dbf_record.items():
        dbf_field_lower = dbf_field.lower()
        
        # Skip globally ignored fields
        if dbf_field_lower in IGNORE_FIELDS:
            continue
        
        # Skip table-specific ignored fields
        if dbf_field_lower in table_ignores:
            continue
        
        # Capture codigoauto value for id assignment (accepts string or numeric)
        if dbf_field_lower in ('codigoauto', 'codigoaut'):
            codigoauto_value = sanitize_id(value)
        
        # Map to table column
        table_col = field_mappings.get(dbf_field_lower, dbf_field_lower)
        
        # Only include if column exists in table
        if table_col not in table_columns:
            continue
        
        col_type = table_columns[table_col]
        
        # Sanitize based on column type
        if col_type == 'date':
            result[table_col] = to_date(value)
        elif col_type in ('real', 'double precision', 'numeric', 'integer', 'bigint', 'smallint'):
            result[table_col] = sanitize_number(value)
        elif col_type == 'boolean':
            result[table_col] = sanitize_boolean(value)
        else:  # text, varchar, character varying
            result[table_col] = sanitize_string(value)
    
    # Set id = codigoauto (required for all tables)
    if codigoauto_value and 'id' in table_columns:
        result['id'] = codigoauto_value
    
    # Also populate the codigoauto/codigo_auto column if it exists
    if codigoauto_value and codigoauto_col in table_columns:
        result[codigoauto_col] = codigoauto_value
    
    return result

def import_dbf_file(conn, dbf_path, table_name):
    """Import a single DBF file into a table"""
    try:
        dbf = DBF(dbf_path, encoding='latin-1')
        records = list(dbf)
    except Exception as e:
        return {"table": table_name, "count": 0, "error": f"Error reading DBF: {e}"}
    
    if not records:
        return {"table": table_name, "count": 0, "error": "No records found"}
    
    # Sort by fecha if exists (case-insensitive check)
    fecha_field = None
    for field in records[0].keys():
        if field.lower() == 'fecha':
            fecha_field = field
            break
    
    if fecha_field:
        records.sort(key=lambda r: to_date(r.get(fecha_field)) or date.min)
    
    table_columns = get_table_columns(conn, table_name)
    if not table_columns:
        return {"table": table_name, "count": 0, "error": "Table not found"}
    
    cur = conn.cursor()
    count = 0
    errors = 0
    
    for record in records:
        mapped = map_dbf_to_table(record, table_name, table_columns)
        
        # Skip if no id (codigoauto mapped to id)
        if 'id' not in mapped or not mapped['id']:
            errors += 1
            continue
        
        # Build INSERT query
        columns = list(mapped.keys())
        values = [mapped[col] for col in columns]
        placeholders = ', '.join(['%s'] * len(columns))
        column_list = ', '.join(columns)
        
        try:
            cur.execute(f"INSERT INTO {table_name} ({column_list}) VALUES ({placeholders})", values)
            count += 1
        except Exception as e:
            errors += 1
            if errors <= 3:
                print(f"  Error inserting into {table_name}: {e}")
    
    conn.commit()
    cur.close()
    
    result = {"table": table_name, "count": count}
    if errors > 0:
        result["errors"] = errors
    return result

def import_zip(zip_path):
    """Import all DBF files from a ZIP"""
    results = []
    
    # Create temp directory
    temp_dir = tempfile.mkdtemp(prefix='dbf_import_')
    
    try:
        # Extract ZIP
        print(f"Extracting {zip_path}...")
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(temp_dir)
        
        # Find DBF files (case-insensitive)
        dbf_files = {}
        for root, dirs, files in os.walk(temp_dir):
            for f in files:
                if f.lower().endswith('.dbf'):
                    table_name = f.lower().replace('.dbf', '')
                    dbf_files[table_name] = os.path.join(root, f)
        
        if not dbf_files:
            return [{"error": "No DBF files found in ZIP"}]
        
        print(f"Found DBF files: {list(dbf_files.keys())}")
        
        # Connect to database
        conn = get_connection()
        
        # Import each table
        for table_name in TABLES:
            if table_name in dbf_files:
                print(f"Importing {table_name}...")
                result = import_dbf_file(conn, dbf_files[table_name], table_name)
                results.append(result)
                print(f"  - {result.get('count', 0)} records imported")
            else:
                print(f"Skipping {table_name} - no DBF file found")
        
        conn.close()
        
    finally:
        # Cleanup temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    return results

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_dbf_global.py <zip_file>")
        sys.exit(1)
    
    zip_path = sys.argv[1]
    
    if not os.path.exists(zip_path):
        print(f"Error: File not found: {zip_path}")
        sys.exit(1)
    
    print("Starting Global DBF import...")
    results = import_zip(zip_path)
    
    print("\n=== Import Summary ===")
    total = 0
    for r in results:
        if 'error' in r and 'table' not in r:
            print(f"Error: {r['error']}")
        else:
            table = r.get('table', 'unknown')
            count = r.get('count', 0)
            errors = r.get('errors', 0)
            total += count
            error_str = f" ({errors} errors)" if errors else ""
            print(f"  {table}: {count} records{error_str}")
    
    print(f"\nTotal: {total} records imported")
    
    # Output JSON for API consumption
    print("\n__JSON_RESULTS__")
    print(json.dumps(results))

if __name__ == '__main__':
    main()
