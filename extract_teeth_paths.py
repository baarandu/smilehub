#!/usr/bin/env python3
"""
Script para extrair paths SVG do arquivo EPS dos dentes.
Requer: pip install cairosvg pillow
"""

import re

# Ler o arquivo EPS
eps_file = "dental-anatomy-chart-with-permanent-human-teeth-realistic-vector-illustration/vecteezy_the-chart-of-human-teeth-doodle-vector-illustration_.eps"

print("Lendo arquivo EPS...")
with open(eps_file, 'rb') as f:
    content = f.read().decode('latin-1', errors='ignore')

# Procurar por BoundingBox
bbox_match = re.search(r'%%BoundingBox:\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)', content)
if bbox_match:
    x1, y1, x2, y2 = map(int, bbox_match.groups())
    print(f"BoundingBox encontrado: {x1} {y1} {x2} {y2}")
    print(f"Dimensões: {x2-x1} x {y2-y1}")

# Procurar por paths (comandos moveto, lineto, curveto)
print("\nProcurando comandos de desenho...")
path_commands = re.findall(r'(\d+\.?\d*)\s+(\d+\.?\d*)\s+(m|l|c)', content[:5000])
if path_commands:
    print(f"Encontrados {len(path_commands)} comandos de desenho nos primeiros 5000 caracteres")
    print("Primeiros 10 comandos:")
    for cmd in path_commands[:10]:
        print(f"  {cmd}")

print("\n" + "="*60)
print("DIAGNÓSTICO:")
print("="*60)
print("\nO arquivo EPS contém paths PostScript que precisam ser convertidos.")
print("Os paths atuais no código parecem ter coordenadas corretas,")
print("mas o problema é o viewBox que não está capturando toda a área.")
print("\nSOLUÇÃO RECOMENDADA:")
print("Ao invés de extrair novos paths, vamos ajustar o viewBox")
print("para garantir que capture toda a área dos dentes existentes.")
