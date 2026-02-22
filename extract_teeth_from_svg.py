#!/usr/bin/env python3
"""
Extrai paths de dentes do SVG agrupado
"""

import re
import xml.etree.ElementTree as ET

svg_file = "dental-anatomy-chart-with-permanent-human-teeth-realistic-vector-illustration/odontograma.svg"

print("Lendo SVG...")
tree = ET.parse(svg_file)
root = tree.getroot()

# Namespace do SVG
ns = {'svg': 'http://www.w3.org/2000/svg'}

# Encontrar todos os grupos
groups = root.findall('.//svg:g', ns)
print(f"\nTotal de grupos encontrados: {len(groups)}")

# Analisar cada grupo
for i, group in enumerate(groups[:20]):  # Primeiros 20 grupos
    group_id = group.get('id', f'no-id-{i}')

    # Encontrar paths dentro do grupo
    paths = group.findall('.//svg:path', ns)

    if paths:
        print(f"\n{'='*60}")
        print(f"Grupo: {group_id}")
        print(f"Número de paths: {len(paths)}")

        # Pegar bounding box se existir
        if 'transform' in group.attrib:
            print(f"Transform: {group.get('transform')}")

        # Mostrar primeiro path como exemplo
        if len(paths) > 0:
            first_path = paths[0].get('d', '')[:100]
            print(f"Exemplo path: {first_path}...")

print("\n" + "="*60)
print("PRÓXIMOS PASSOS:")
print("="*60)
print("1. Identifique qual grupo corresponde a cada dente (18, 17, 16...)")
print("2. Indique os IDs dos grupos na ordem correta")
print("3. Vou gerar os paths TypeScript organizados")
