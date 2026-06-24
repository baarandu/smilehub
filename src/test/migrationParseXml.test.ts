import { describe, it, expect } from 'vitest';
import { parseXML } from '@/services/migration';

// XML no formato típico de export do Simples Dental (contatos de pacientes)
const SIMPLES_DENTAL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<pacientes>
  <paciente>
    <nome>Maria Silva Santos</nome>
    <cpf>123.456.789-09</cpf>
    <telefone>(11) 98765-4321</telefone>
    <email>maria.silva@email.com</email>
    <data_nascimento>15/03/1985</data_nascimento>
  </paciente>
  <paciente>
    <nome>João Pereira Costa</nome>
    <cpf>987.654.321-00</cpf>
    <telefone>(11) 91234-5678</telefone>
    <email>joao.costa@email.com</email>
    <data_nascimento>22/07/1990</data_nascimento>
  </paciente>
  <paciente>
    <nome>Ana Carolina Oliveira</nome>
    <cpf>456.789.123-11</cpf>
    <telefone>(21) 99876-5432</telefone>
    <email>ana.oliveira@email.com</email>
    <data_nascimento>08/11/1978</data_nascimento>
  </paciente>
</pacientes>`;

function xmlFile(content: string, name = 'pacientes.xml'): File {
  return new File([content], name, { type: 'application/xml' });
}

describe('parseXML (migração de dados)', () => {
  it('detecta <paciente> como registro e extrai 3 linhas', async () => {
    const result = await parseXML(xmlFile(SIMPLES_DENTAL_XML));

    expect(result.totalRows).toBe(3);
    expect(result.rows).toHaveLength(3);
    expect(result.headers).toEqual(
      expect.arrayContaining(['nome', 'cpf', 'telefone', 'email', 'data_nascimento'])
    );

    expect(result.rows[0]).toMatchObject({
      nome: 'Maria Silva Santos',
      cpf: '123.456.789-09',
      telefone: '(11) 98765-4321',
      email: 'maria.silva@email.com',
      data_nascimento: '15/03/1985',
    });
    expect(result.rows[2].nome).toBe('Ana Carolina Oliveira');
  });

  it('suporta atributos no elemento de registro', async () => {
    const withAttrs = `<?xml version="1.0"?>
<root>
  <patient id="1" status="active"><name>Foo</name></patient>
  <patient id="2" status="inactive"><name>Bar</name></patient>
</root>`;
    const result = await parseXML(xmlFile(withAttrs));

    expect(result.totalRows).toBe(2);
    expect(result.headers).toEqual(expect.arrayContaining(['id', 'status', 'name']));
    expect(result.rows[0]).toMatchObject({ id: '1', status: 'active', name: 'Foo' });
  });

  it('rejeita XML malformado', async () => {
    await expect(parseXML(xmlFile('<root><unclosed></root>'))).rejects.toThrow();
  });
});
