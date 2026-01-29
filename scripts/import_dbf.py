#!/usr/bin/env python3
"""
Import DBF data to PostgreSQL database for administration module.
Maps DBF records to: gastos, nominas, ventas, cuentas_cobrar, cuentas_pagar, prestamos
"""

import os
import json
import psycopg2
from dbfread import DBF
from uuid import uuid4

DATABASE_URL = os.environ.get('DATABASE_URL')
DBF_PATH = '/tmp/dbf_import/administracion.dbf'

def get_connection():
    return psycopg2.connect(DATABASE_URL)

def normalize_name(name):
    """Normalize name for comparison"""
    if not name:
        return None
    return name.strip().lower().replace('\x00', '')

def clean_string(s):
    """Remove NUL characters from string"""
    if s is None:
        return None
    if isinstance(s, str):
        return s.replace('\x00', '')
    return s

def load_dbf_records():
    """Load all records from DBF file"""
    table = DBF(DBF_PATH, encoding='latin-1')
    records = list(table)
    print(f"Loaded {len(records)} records from DBF")
    return records

def get_boolean(val, default=False):
    """Convert DBF value to boolean, recognizing 't'/'f' format"""
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.strip().lower() in ('true', '1', 's', 'si', 'yes', 't', 'v')
    return bool(val)

def get_habilitado(record):
    """Get habilitado value from ABILITADO field (note: without H in DBF)"""
    val = record.get('ABILITADO')
    if val is None:
        return True  # Default to True if field doesn't exist
    return get_boolean(val)

def extract_unique_values(records):
    """Extract unique values for reference tables"""
    unidades = {}  # {nombre: habilitado}
    actividades = {}  # {nombre: {'unidades': set, 'habilitado': bool}}
    clientes = {}
    insumos = {}
    personal = {}
    productos = {}
    proveedores = {}
    
    for r in records:
        unidad = normalize_name(r.get('UNIDADDEPR'))
        habilitado = get_habilitado(r)
        if unidad:
            # For unidades, keep habilitado True if any record has it True
            if unidad not in unidades:
                unidades[unidad] = habilitado
            elif habilitado:
                unidades[unidad] = True
            
            actividad = normalize_name(r.get('ACTIVIDAD'))
            if actividad:
                if actividad not in actividades:
                    actividades[actividad] = {'unidades': set(), 'habilitado': habilitado}
                actividades[actividad]['unidades'].add(unidad)
                if habilitado:
                    actividades[actividad]['habilitado'] = True
            
            cliente = normalize_name(r.get('CLIENTE'))
            if cliente:
                if cliente not in clientes:
                    clientes[cliente] = {'unidades': set(), 'habilitado': habilitado}
                clientes[cliente]['unidades'].add(unidad)
                if habilitado:
                    clientes[cliente]['habilitado'] = True
            
            insumo = normalize_name(r.get('INSUMO'))
            if insumo:
                if insumo not in insumos:
                    insumos[insumo] = {'unidades': set(), 'habilitado': habilitado}
                insumos[insumo]['unidades'].add(unidad)
                if habilitado:
                    insumos[insumo]['habilitado'] = True
            
            pers = normalize_name(r.get('PERSONALDE'))
            if pers:
                if pers not in personal:
                    personal[pers] = {'unidades': set(), 'habilitado': habilitado}
                personal[pers]['unidades'].add(unidad)
                if habilitado:
                    personal[pers]['habilitado'] = True
            
            producto = normalize_name(r.get('PRODUCTO'))
            if producto:
                if producto not in productos:
                    productos[producto] = {'unidades': set(), 'habilitado': habilitado}
                productos[producto]['unidades'].add(unidad)
                if habilitado:
                    productos[producto]['habilitado'] = True
            
            proveedor = normalize_name(r.get('PROVEEDOR'))
            if proveedor:
                if proveedor not in proveedores:
                    proveedores[proveedor] = {'unidades': set(), 'habilitado': habilitado}
                proveedores[proveedor]['unidades'].add(unidad)
                if habilitado:
                    proveedores[proveedor]['habilitado'] = True
    
    return {
        'unidades': unidades,
        'actividades': actividades,
        'clientes': clientes,
        'insumos': insumos,
        'personal': personal,
        'productos': productos,
        'proveedores': proveedores
    }

def insert_reference_data(conn, unique_values):
    """Insert reference data and return ID mappings"""
    cur = conn.cursor()
    mappings = {
        'unidades': {},
        'actividades': {},
        'clientes': {},
        'insumos': {},
        'personal': {},
        'productos': {},
        'proveedores': {}
    }
    
    # Insert unidades_produccion
    print("Inserting unidades_produccion...")
    for nombre, habilitado in unique_values['unidades'].items():
        uid = str(uuid4())
        cur.execute("""
            INSERT INTO unidades_produccion (id, nombre, habilitado)
            VALUES (%s, %s, %s)
            ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
            RETURNING id
        """, (uid, nombre, habilitado))
        result = cur.fetchone()
        mappings['unidades'][nombre] = result[0]
    conn.commit()
    print(f"  Inserted {len(mappings['unidades'])} unidades")
    
    # Helper to get first unidad for an item
    def get_first_unidad(unidades_set):
        for u in unidades_set:
            return mappings['unidades'].get(u)
        return None
    
    # Insert actividades
    print("Inserting actividades...")
    for nombre, data in unique_values['actividades'].items():
        uid = str(uuid4())
        unidad_id = get_first_unidad(data['unidades'])
        habilitado = data.get('habilitado', True)
        cur.execute("""
            INSERT INTO actividades (id, nombre, unidad_produccion_id, habilitado)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id
        """, (uid, nombre, unidad_id, habilitado))
        result = cur.fetchone()
        if result:
            mappings['actividades'][nombre] = result[0]
        else:
            cur.execute("SELECT id FROM actividades WHERE LOWER(nombre) = %s LIMIT 1", (nombre,))
            result = cur.fetchone()
            if result:
                mappings['actividades'][nombre] = result[0]
    conn.commit()
    print(f"  Inserted {len(mappings['actividades'])} actividades")
    
    # Insert clientes
    print("Inserting clientes...")
    for nombre, data in unique_values['clientes'].items():
        uid = str(uuid4())
        unidad_id = get_first_unidad(data['unidades'])
        habilitado = data.get('habilitado', True)
        cur.execute("""
            INSERT INTO clientes (id, nombre, unidad_produccion_id, habilitado)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id
        """, (uid, nombre, unidad_id, habilitado))
        result = cur.fetchone()
        if result:
            mappings['clientes'][nombre] = result[0]
        else:
            cur.execute("SELECT id FROM clientes WHERE LOWER(nombre) = %s LIMIT 1", (nombre,))
            result = cur.fetchone()
            if result:
                mappings['clientes'][nombre] = result[0]
    conn.commit()
    print(f"  Inserted {len(mappings['clientes'])} clientes")
    
    # Insert insumos
    print("Inserting insumos...")
    for nombre, data in unique_values['insumos'].items():
        uid = str(uuid4())
        unidad_id = get_first_unidad(data['unidades'])
        habilitado = data.get('habilitado', True)
        cur.execute("""
            INSERT INTO insumos (id, nombre, unidad_produccion_id, habilitado)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id
        """, (uid, nombre, unidad_id, habilitado))
        result = cur.fetchone()
        if result:
            mappings['insumos'][nombre] = result[0]
        else:
            cur.execute("SELECT id FROM insumos WHERE LOWER(nombre) = %s LIMIT 1", (nombre,))
            result = cur.fetchone()
            if result:
                mappings['insumos'][nombre] = result[0]
    conn.commit()
    print(f"  Inserted {len(mappings['insumos'])} insumos")
    
    # Insert personal
    print("Inserting personal...")
    for nombre, data in unique_values['personal'].items():
        uid = str(uuid4())
        unidad_id = get_first_unidad(data['unidades'])
        habilitado = data.get('habilitado', True)
        cur.execute("""
            INSERT INTO personal (id, nombre, unidad_produccion_id, habilitado)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id
        """, (uid, nombre, unidad_id, habilitado))
        result = cur.fetchone()
        if result:
            mappings['personal'][nombre] = result[0]
        else:
            cur.execute("SELECT id FROM personal WHERE LOWER(nombre) = %s LIMIT 1", (nombre,))
            result = cur.fetchone()
            if result:
                mappings['personal'][nombre] = result[0]
    conn.commit()
    print(f"  Inserted {len(mappings['personal'])} personal")
    
    # Insert productos
    print("Inserting productos...")
    for nombre, data in unique_values['productos'].items():
        uid = str(uuid4())
        unidad_id = get_first_unidad(data['unidades'])
        habilitado = data.get('habilitado', True)
        cur.execute("""
            INSERT INTO productos (id, nombre, unidad_produccion_id, habilitado)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id
        """, (uid, nombre, unidad_id, habilitado))
        result = cur.fetchone()
        if result:
            mappings['productos'][nombre] = result[0]
        else:
            cur.execute("SELECT id FROM productos WHERE LOWER(nombre) = %s LIMIT 1", (nombre,))
            result = cur.fetchone()
            if result:
                mappings['productos'][nombre] = result[0]
    conn.commit()
    print(f"  Inserted {len(mappings['productos'])} productos")
    
    # Insert proveedores
    print("Inserting proveedores...")
    for nombre, data in unique_values['proveedores'].items():
        uid = str(uuid4())
        unidad_id = get_first_unidad(data['unidades'])
        habilitado = data.get('habilitado', True)
        cur.execute("""
            INSERT INTO proveedores (id, nombre, unidad_produccion_id, habilitado)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
            RETURNING id
        """, (uid, nombre, unidad_id, habilitado))
        result = cur.fetchone()
        if result:
            mappings['proveedores'][nombre] = result[0]
        else:
            cur.execute("SELECT id FROM proveedores WHERE LOWER(nombre) = %s LIMIT 1", (nombre,))
            result = cur.fetchone()
            if result:
                mappings['proveedores'][nombre] = result[0]
    conn.commit()
    print(f"  Inserted {len(mappings['proveedores'])} proveedores")
    
    cur.close()
    return mappings

def format_date(d):
    """Format date to YYYY-MM-DD string"""
    if d is None:
        return None
    if hasattr(d, 'isoformat'):
        return d.isoformat()
    return str(d)

def insert_transactional_data(conn, records, mappings):
    """Insert transactional records into respective tables"""
    cur = conn.cursor()
    
    tipo_mapping = {
        'facturas': 'gastos',
        'nomina': 'nominas',
        'ventas': 'ventas',
        'cuentasporcobrar': 'cuentas_cobrar',
        'cuentasporpagar': 'cuentas_pagar',
        'prestamos': 'prestamos'
    }
    
    counts = {t: 0 for t in tipo_mapping.values()}
    errors = {t: 0 for t in tipo_mapping.values()}
    
    for r in records:
        tipo = r.get('TIPO', '').lower()
        table_name = tipo_mapping.get(tipo)
        if not table_name:
            continue
        
        unidad = normalize_name(r.get('UNIDADDEPR'))
        unidad_id = mappings['unidades'].get(unidad)
        if not unidad_id:
            errors[table_name] += 1
            continue
        
        fecha = format_date(r.get('FECHA'))
        monto = r.get('MONTO') or 0
        monto_dolares = r.get('MONTODOL') or 0
        forma_pago = clean_string(r.get('FORMADEPAG'))
        comprobante = clean_string(r.get('COMPROBANT'))
        descripcion = clean_string(r.get('DESCRIPCIO'))
        relacionado = get_boolean(r.get('RELAZ'))
        anticipo = get_boolean(r.get('CAPITAL'))
        utility = get_boolean(r.get('UTILITY'))
        cantidad = r.get('CANTIDAD')
        
        uid = str(uuid4())
        
        try:
            if table_name == 'gastos':
                proveedor_id = mappings['proveedores'].get(normalize_name(r.get('PROVEEDOR')))
                insumo_id = mappings['insumos'].get(normalize_name(r.get('INSUMO')))
                actividad_id = mappings['actividades'].get(normalize_name(r.get('ACTIVIDAD')))
                
                cur.execute("""
                    INSERT INTO gastos (id, unidad_produccion_id, fecha, proveedor_id, insumo_id, 
                        actividad_id, cantidad, monto, monto_dolares, forma_pago, comprobante, 
                        descripcion, relacionado, anticipo, utility, evidenciado)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false)
                """, (uid, unidad_id, fecha, proveedor_id, insumo_id, actividad_id, cantidad,
                      monto, monto_dolares, forma_pago, comprobante, descripcion, relacionado, anticipo, utility))
                
            elif table_name == 'nominas':
                personal_id = mappings['personal'].get(normalize_name(r.get('PERSONALDE')))
                actividad_id = mappings['actividades'].get(normalize_name(r.get('ACTIVIDAD')))
                
                cur.execute("""
                    INSERT INTO nominas (id, unidad_produccion_id, fecha, personal_id, actividad_id,
                        monto, monto_dolares, forma_pago, comprobante, descripcion, relacionado, anticipo, utility, evidenciado)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false)
                """, (uid, unidad_id, fecha, personal_id, actividad_id, monto, monto_dolares,
                      forma_pago, comprobante, descripcion, relacionado, anticipo, utility))
                
            elif table_name == 'ventas':
                cliente_id = mappings['clientes'].get(normalize_name(r.get('CLIENTE')))
                producto_id = mappings['productos'].get(normalize_name(r.get('PRODUCTO')))
                
                cur.execute("""
                    INSERT INTO ventas (id, unidad_produccion_id, fecha, cliente_id, producto_id,
                        cantidad, monto, monto_dolares, forma_pago, comprobante, descripcion, relacionado, anticipo, utility, evidenciado)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false)
                """, (uid, unidad_id, fecha, cliente_id, producto_id, cantidad, monto, monto_dolares,
                      forma_pago, comprobante, descripcion, relacionado, anticipo, utility))
                
            elif table_name == 'cuentas_cobrar':
                cliente_id = mappings['clientes'].get(normalize_name(r.get('CLIENTE')))
                producto_id = mappings['productos'].get(normalize_name(r.get('PRODUCTO')))
                
                cur.execute("""
                    INSERT INTO cuentas_cobrar (id, unidad_produccion_id, fecha, cliente_id, producto_id,
                        cantidad, monto, monto_dolares, forma_pago, comprobante, descripcion, relacionado, anticipo, utility, evidenciado)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false)
                """, (uid, unidad_id, fecha, cliente_id, producto_id, cantidad, monto, monto_dolares,
                      forma_pago, comprobante, descripcion, relacionado, anticipo, utility))
                
            elif table_name == 'cuentas_pagar':
                proveedor_id = mappings['proveedores'].get(normalize_name(r.get('PROVEEDOR')))
                insumo_id = mappings['insumos'].get(normalize_name(r.get('INSUMO')))
                actividad_id = mappings['actividades'].get(normalize_name(r.get('ACTIVIDAD')))
                
                cur.execute("""
                    INSERT INTO cuentas_pagar (id, unidad_produccion_id, fecha, proveedor_id, insumo_id,
                        actividad_id, cantidad, monto, monto_dolares, forma_pago, comprobante, descripcion, relacionado, anticipo, utility, evidenciado)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false)
                """, (uid, unidad_id, fecha, proveedor_id, insumo_id, actividad_id, cantidad,
                      monto, monto_dolares, forma_pago, comprobante, descripcion, relacionado, anticipo, utility))
                
            elif table_name == 'prestamos':
                personal_id = mappings['personal'].get(normalize_name(r.get('PERSONALDE')))
                actividad_id = mappings['actividades'].get(normalize_name(r.get('ACTIVIDAD')))
                
                cur.execute("""
                    INSERT INTO prestamos (id, unidad_produccion_id, fecha, personal_id, actividad_id,
                        monto, monto_dolares, forma_pago, comprobante, descripcion, relacionado, anticipo, utility, evidenciado)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false)
                """, (uid, unidad_id, fecha, personal_id, actividad_id, monto, monto_dolares,
                      forma_pago, comprobante, descripcion, relacionado, anticipo, utility))
            
            counts[table_name] += 1
            
        except Exception as e:
            errors[table_name] += 1
            print(f"Error inserting {table_name}: {e}")
            conn.rollback()
            continue
    
    conn.commit()
    cur.close()
    
    print("\nImport Summary:")
    for table, count in counts.items():
        print(f"  {table}: {count} records inserted, {errors[table]} errors")
    
    return counts, errors

def main():
    print("Starting DBF import...")
    print(f"Database: {DATABASE_URL[:50]}...")
    
    conn = get_connection()
    
    # Load DBF records
    records = load_dbf_records()
    
    # Extract unique values
    print("\nExtracting unique values...")
    unique_values = extract_unique_values(records)
    print(f"  Unidades: {len(unique_values['unidades'])}")
    print(f"  Actividades: {len(unique_values['actividades'])}")
    print(f"  Clientes: {len(unique_values['clientes'])}")
    print(f"  Insumos: {len(unique_values['insumos'])}")
    print(f"  Personal: {len(unique_values['personal'])}")
    print(f"  Productos: {len(unique_values['productos'])}")
    print(f"  Proveedores: {len(unique_values['proveedores'])}")
    
    # Insert reference data
    print("\nInserting reference data...")
    mappings = insert_reference_data(conn, unique_values)
    
    # Insert transactional data
    print("\nInserting transactional data...")
    insert_transactional_data(conn, records, mappings)
    
    conn.close()
    print("\nImport completed!")

if __name__ == '__main__':
    main()
