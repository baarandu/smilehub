import { Link } from 'react-router-dom';

const DPA = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <Link to="/" className="text-primary font-bold text-xl hover:opacity-80 transition-opacity">
            Organiza Odonto
          </Link>
          <Link
            to="/"
            className="text-sm text-primary hover:underline"
          >
            &larr; Voltar ao aplicativo
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 space-y-10 text-justify">
          {/* Title */}
          <div className="text-center border-b border-gray-200 pb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Acordo de Processamento de Dados (DPA)
            </h1>
            <p className="text-gray-500 text-sm">
              Data Processing Agreement &mdash; Em conformidade com a LGPD (Lei n&ordm; 13.709/2018)
            </p>
          </div>

          {/* Resumo */}
          <section className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-2">
            <h2 className="text-base font-semibold text-gray-900">Em poucas palavras</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Este acordo regula a rela&ccedil;&atilde;o entre a <strong>cl&iacute;nica odontol&oacute;gica</strong> (Controladora)
              e o <strong>Organiza Odonto</strong> (Operador) no que diz respeito ao tratamento de dados pessoais.
              Ele define responsabilidades, medidas de seguran&ccedil;a, fluxos de comunica&ccedil;&atilde;o e direitos
              dos titulares, garantindo conformidade com a LGPD.
            </p>
          </section>

          {/* 1. Objeto e Finalidade */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              1. Objeto e Finalidade do Acordo
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O presente Acordo de Processamento de Dados (&ldquo;DPA&rdquo;) tem por objeto regular as
              condi&ccedil;&otilde;es em que o <strong>Operador</strong> (Organiza Odonto) realiza o tratamento de dados
              pessoais em nome e por instru&ccedil;&atilde;o do <strong>Controlador</strong> (Cl&iacute;nica), no &acirc;mbito da
              presta&ccedil;&atilde;o de servi&ccedil;os de gest&atilde;o odontol&oacute;gica por meio da plataforma.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Este DPA &eacute; parte integrante dos Termos de Uso da plataforma e aplica-se a todo tratamento
              de dados pessoais realizado pelo Operador em decorr&ecirc;ncia da rela&ccedil;&atilde;o contratual,
              incluindo dados de pacientes, profissionais e demais titulares cujos dados sejam
              inseridos na plataforma pelo Controlador.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              A finalidade do tratamento &eacute; exclusivamente a presta&ccedil;&atilde;o dos servi&ccedil;os contratados,
              que incluem: gest&atilde;o de prontu&aacute;rios, agendamento de consultas, controle financeiro,
              comunica&ccedil;&atilde;o com pacientes, funcionalidades de intelig&ecirc;ncia artificial assistiva e
              demais funcionalidades disponibilizadas pela plataforma.
            </p>
          </section>

          {/* 2. Definicoes */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              2. Defini&ccedil;&otilde;es
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para fins deste Acordo, aplicam-se as seguintes defini&ccedil;&otilde;es, conforme a LGPD:
            </p>
            <div className="space-y-3">
              {[
                {
                  term: 'Controlador',
                  def: 'A cl\u00ednica odontol\u00f3gica ou consult\u00f3rio que contrata a plataforma e determina as finalidades e os meios de tratamento dos dados pessoais de seus pacientes e colaboradores.'
                },
                {
                  term: 'Operador',
                  def: 'O Organiza Odonto, que realiza o tratamento de dados pessoais em nome e conforme as instru\u00e7\u00f5es do Controlador, por meio da plataforma SaaS.'
                },
                {
                  term: 'Suboperador',
                  def: 'Terceiros contratados pelo Operador para auxiliar no tratamento de dados, como provedores de infraestrutura, processamento de pagamentos e servi\u00e7os de intelig\u00eancia artificial.'
                },
                {
                  term: 'Dados Pessoais',
                  def: 'Informa\u00e7\u00e3o relacionada a pessoa natural identificada ou identific\u00e1vel, incluindo nome, CPF, e-mail, telefone, endere\u00e7o e demais dados cadastrais.'
                },
                {
                  term: 'Dados Pessoais Sens\u00edveis',
                  def: 'Dados sobre sa\u00fade (hist\u00f3rico odontol\u00f3gico, anamnese, planos de tratamento, radiografias), al\u00e9m de dados gen\u00e9ticos e biom\u00e9tricos, quando aplic\u00e1vel.'
                },
                {
                  term: 'Titular',
                  def: 'Pessoa natural a quem se referem os dados pessoais que s\u00e3o objeto de tratamento \u2014 pacientes, profissionais e demais indiv\u00edduos cadastrados.'
                },
                {
                  term: 'ANPD',
                  def: 'Autoridade Nacional de Prote\u00e7\u00e3o de Dados, \u00f3rg\u00e3o da administra\u00e7\u00e3o p\u00fablica respons\u00e1vel por zelar, implementar e fiscalizar o cumprimento da LGPD.'
                },
              ].map((item) => (
                <div key={item.term} className="border-l-4 border-primary/60 pl-4">
                  <p className="text-sm font-medium text-gray-800">{item.term}</p>
                  <p className="text-sm text-gray-600">{item.def}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Obrigacoes do Operador */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              3. Obriga&ccedil;&otilde;es do Operador (Organiza Odonto)
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O Operador compromete-se a:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                Tratar os dados pessoais exclusivamente conforme as instru&ccedil;&otilde;es documentadas
                do Controlador e para as finalidades previstas no contrato de presta&ccedil;&atilde;o de servi&ccedil;os.
                S&atilde;o consideradas instru&ccedil;&otilde;es documentadas: (a) configura&ccedil;&otilde;es realizadas pelo
                Controlador nas funcionalidades da plataforma; (b) solicita&ccedil;&otilde;es formalizadas
                por escrito via e-mail ou canal oficial de suporte; e (c) disposi&ccedil;&otilde;es previstas
                nos Termos de Uso, Pol&iacute;tica de Privacidade e neste DPA.
              </li>
              <li>
                Informar imediatamente o Controlador caso considere que uma instru&ccedil;&atilde;o deste
                viola a LGPD ou outras disposi&ccedil;&otilde;es aplic&aacute;veis de prote&ccedil;&atilde;o de dados, podendo
                suspender o cumprimento da instru&ccedil;&atilde;o at&eacute; que o Controlador a confirme ou
                modifique por escrito.
              </li>
              <li>
                Garantir que pessoas autorizadas a tratar os dados pessoais tenham se comprometido
                com obriga&ccedil;&otilde;es de confidencialidade ou estejam sujeitas a obriga&ccedil;&atilde;o legal de sigilo.
              </li>
              <li>
                Implementar e manter medidas t&eacute;cnicas e administrativas de seguran&ccedil;a adequadas &agrave;
                prote&ccedil;&atilde;o dos dados, conforme descrito na Se&ccedil;&atilde;o 7 deste Acordo.
              </li>
              <li>
                N&atilde;o subcontratar outro operador sem autoriza&ccedil;&atilde;o pr&eacute;via do Controlador, exceto
                conforme previsto na Se&ccedil;&atilde;o 5 (Suboperadores).
              </li>
              <li>
                Auxiliar o Controlador no atendimento de solicita&ccedil;&otilde;es de titulares relativas ao
                exerc&iacute;cio de seus direitos previstos na LGPD.
              </li>
              <li>
                Auxiliar o Controlador no cumprimento de obriga&ccedil;&otilde;es perante a ANPD, incluindo
                notifica&ccedil;&otilde;es de incidentes de seguran&ccedil;a e elabora&ccedil;&atilde;o de Relat&oacute;rios de Impacto
                &agrave; Prote&ccedil;&atilde;o de Dados Pessoais (RIPD). O Operador fornecer&aacute; informa&ccedil;&otilde;es
                t&eacute;cnicas sobre medidas de seguran&ccedil;a, fluxos de dados e suboperadores para
                que o Controlador elabore o RIPD, caso solicitado pela ANPD. A responsabilidade
                de elabora&ccedil;&atilde;o do RIPD &eacute; do Controlador.
              </li>
              <li>
                Ap&oacute;s o t&eacute;rmino da presta&ccedil;&atilde;o dos servi&ccedil;os, devolver ou eliminar os dados pessoais,
                exceto quando houver obriga&ccedil;&atilde;o legal de reten&ccedil;&atilde;o.
              </li>
              <li>
                Disponibilizar ao Controlador as informa&ccedil;&otilde;es necess&aacute;rias para demonstrar conformidade
                com as obriga&ccedil;&otilde;es deste Acordo e permitir auditorias conforme Se&ccedil;&atilde;o 10.
              </li>
              <li>
                N&atilde;o utilizar os dados pessoais para finalidades pr&oacute;prias, incluindo
                marketing, publicidade, an&aacute;lise comportamental ou venda a terceiros.
              </li>
              <li>
                Manter registro das atividades de tratamento realizadas em nome do Controlador,
                conforme Art. 37 da LGPD, podendo disponibilizar sum&aacute;rio dessas informa&ccedil;&otilde;es
                mediante solicita&ccedil;&atilde;o razo&aacute;vel do Controlador.
              </li>
              <li>
                O Operador <strong>n&atilde;o realiza decis&otilde;es automatizadas</strong> que produzam efeitos
                jur&iacute;dicos ou significativamente impactantes aos titulares, nos termos do
                Art. 20 da LGPD. Todas as funcionalidades de intelig&ecirc;ncia artificial s&atilde;o de
                car&aacute;ter exclusivamente assistivo e dependem de a&ccedil;&atilde;o humana para produ&ccedil;&atilde;o de efeitos.
              </li>
            </ul>
          </section>

          {/* 4. Obrigacoes do Controlador */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              4. Obriga&ccedil;&otilde;es do Controlador (Cl&iacute;nica)
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O Controlador compromete-se a:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                Garantir que a coleta de dados pessoais de pacientes seja realizada de forma l&iacute;cita,
                com base legal adequada (consentimento, obriga&ccedil;&atilde;o legal, tutela da sa&uacute;de, etc.).
              </li>
              <li>
                Fornecer instru&ccedil;&otilde;es claras e documentadas ao Operador sobre o tratamento de dados,
                garantindo que sejam l&iacute;citas e compat&iacute;veis com a LGPD.
              </li>
              <li>
                Informar os titulares (pacientes) sobre o uso da plataforma para tratamento de seus
                dados, incluindo a possibilidade de uso de funcionalidades de intelig&ecirc;ncia artificial.
              </li>
              <li>
                Obter o consentimento espec&iacute;fico dos titulares quando necess&aacute;rio, especialmente para
                dados sens&iacute;veis de sa&uacute;de e uso de funcionalidades de IA.
              </li>
              <li>
                Cumprir as obriga&ccedil;&otilde;es regulat&oacute;rias do Conselho Federal de Odontologia (CFO) e
                do Conselho Regional de Odontologia (CRO) aplic&aacute;vel.
              </li>
              <li>
                Notificar o Operador sobre qualquer altera&ccedil;&atilde;o nas instru&ccedil;&otilde;es de tratamento
                ou sobre solicita&ccedil;&otilde;es de titulares que exijam a coopera&ccedil;&atilde;o do Operador.
              </li>
              <li>
                Manter registro atualizado das atividades de tratamento sob sua responsabilidade,
                conforme Art. 37 da LGPD.
              </li>
              <li>
                Designar um Encarregado de Prote&ccedil;&atilde;o de Dados (DPO) conforme exig&ecirc;ncia da LGPD.
              </li>
            </ul>
          </section>

          {/* 5. Suboperadores */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              5. Suboperadores
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O Controlador autoriza o Operador a utilizar suboperadores para a presta&ccedil;&atilde;o dos servi&ccedil;os,
              nas seguintes categorias:
            </p>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Provedores de Infraestrutura e Banco de Dados</p>
                <p className="text-sm text-gray-600 mt-1">
                  Armazenamento seguro com criptografia em repouso e em tr&acirc;nsito. Certifica&ccedil;&otilde;es
                  SOC 2 Type II e conformidade com padr&otilde;es internacionais de seguran&ccedil;a.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Provedores de Processamento de Pagamentos</p>
                <p className="text-sm text-gray-600 mt-1">
                  Processamento de cobran&ccedil;as e assinaturas com certifica&ccedil;&atilde;o PCI DSS Level 1.
                  Dados de cart&atilde;o gerenciados exclusivamente pelo provedor.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Provedores de Intelig&ecirc;ncia Artificial</p>
                <p className="text-sm text-gray-600 mt-1">
                  Transcri&ccedil;&atilde;o de &aacute;udio e assist&ecirc;ncia cl&iacute;nica com pseudonimiza&ccedil;&atilde;o pr&eacute;via
                  dos dados. Compromisso contratual de n&atilde;o usar dados para treinamento de modelos.
                </p>
              </div>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              O Operador se compromete a: (i) selecionar suboperadores que ofere&ccedil;am garantias adequadas
              de prote&ccedil;&atilde;o de dados; (ii) celebrar contratos com cada suboperador impondo obriga&ccedil;&otilde;es
              equivalentes &agrave;s deste DPA; (iii) informar o Controlador sobre a inclus&atilde;o de novos
              suboperadores com anteced&ecirc;ncia m&iacute;nima de 15 dias; (iv) permanecer respons&aacute;vel
              perante o Controlador pelos atos de seus suboperadores.
            </p>
            <div className="border-l-4 border-blue-400 pl-4 bg-blue-50/50 p-3 rounded-r-md">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Direito de obje&ccedil;&atilde;o:</strong> O Controlador ter&aacute; 15 dias ap&oacute;s a
                notifica&ccedil;&atilde;o para apresentar obje&ccedil;&atilde;o fundamentada &agrave; inclus&atilde;o de novo suboperador.
                Caso a obje&ccedil;&atilde;o n&atilde;o seja resolvida de forma satisfat&oacute;ria para ambas as partes, o
                Controlador poder&aacute; rescindir o contrato sem penalidade, mediante aviso pr&eacute;vio de 30 dias.
              </p>
            </div>
          </section>

          {/* 6. Transferencia Internacional */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              6. Transfer&ecirc;ncia Internacional de Dados
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Alguns suboperadores podem processar dados em servidores localizados fora do Brasil.
              Essas transfer&ecirc;ncias s&atilde;o realizadas em conformidade com o Art. 33 da LGPD, com base
              nas seguintes salvaguardas:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                Cl&aacute;usulas contratuais padr&atilde;o que asseguram n&iacute;vel adequado de prote&ccedil;&atilde;o de dados,
                incluindo obriga&ccedil;&otilde;es de confidencialidade, seguran&ccedil;a e limita&ccedil;&atilde;o de finalidade.
              </li>
              <li>
                Certifica&ccedil;&otilde;es de seguran&ccedil;a reconhecidas internacionalmente (SOC 2, ISO 27001).
              </li>
              <li>
                Pseudonimiza&ccedil;&atilde;o e <em>masking</em> de dados identific&aacute;veis antes do envio a
                servi&ccedil;os de IA, minimizando o risco de identifica&ccedil;&atilde;o.
              </li>
              <li>
                Compromisso contratual de n&atilde;o utilizar os dados para finalidades pr&oacute;prias.
              </li>
            </ul>
            <div className="border-l-4 border-amber-400 pl-4 bg-amber-50/50 p-3 rounded-r-md">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Nota:</strong> O Operador manter&aacute; o Controlador informado sobre os pa&iacute;ses onde
                os dados s&atilde;o processados e sobre quaisquer altera&ccedil;&otilde;es relevantes na localiza&ccedil;&atilde;o
                dos servidores utilizados pelos suboperadores. O Operador manter&aacute; lista atualizada
                de suboperadores e respectivos pa&iacute;ses de processamento, dispon&iacute;vel mediante
                solicita&ccedil;&atilde;o do Controlador.
              </p>
            </div>
          </section>

          {/* 7. Medidas de Seguranca */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              7. Medidas T&eacute;cnicas e Administrativas de Seguran&ccedil;a
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O Operador implementa e mant&eacute;m as seguintes medidas para garantir a seguran&ccedil;a dos
              dados pessoais tratados:
            </p>

            <h3 className="text-sm font-semibold text-gray-800 mt-2">Medidas T&eacute;cnicas</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'Criptografia em repouso (AES-256) e em tr\u00e2nsito (TLS 1.2+)',
                'Criptografia adicional (pgcrypto) para CPF e RG',
                'Controle de acesso baseado em fun\u00e7\u00f5es (RBAC)',
                'Row Level Security (RLS) no banco de dados',
                'Autentica\u00e7\u00e3o JWT com tokens de curta dura\u00e7\u00e3o',
                'Logs de auditoria imut\u00e1veis com rastreamento de IP',
                'Pol\u00edtica de senhas fortes (m\u00ednimo 12 caracteres)',
                'Headers de seguran\u00e7a (CSP, HSTS, X-Frame-Options)',
                'Pseudonimiza\u00e7\u00e3o antes do envio para servi\u00e7os de IA',
                'Rate limiting em todas as APIs',
                'Valida\u00e7\u00e3o e sanitiza\u00e7\u00e3o de entrada em todas as fun\u00e7\u00f5es',
                'Whitelist de origens CORS sem fallback',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-primary mt-0.5 font-bold">&bull;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mt-4">Medidas Administrativas</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'Acordos de confidencialidade com colaboradores',
                'Acesso ao banco de dados restrito a pessoal autorizado',
                'Treinamento sobre prote\u00e7\u00e3o de dados e sigilo',
                'Revis\u00e3o peri\u00f3dica de permiss\u00f5es de acesso',
                'Desenvolvimento seguro com code review obrigat\u00f3rio',
                'Gerenciamento de depend\u00eancias e atualiza\u00e7\u00f5es de seguran\u00e7a',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-primary mt-0.5 font-bold">&bull;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 8. Notificacao de Incidentes */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              8. Notifica&ccedil;&atilde;o de Incidentes de Seguran&ccedil;a
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Em caso de incidente de seguran&ccedil;a que envolva dados pessoais tratados no &acirc;mbito
              deste Acordo, o Operador compromete-se a:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Notificar o Controlador em at&eacute; 48 (quarenta e oito) horas</strong> ap&oacute;s
                a confirma&ccedil;&atilde;o razo&aacute;vel do incidente, conforme an&aacute;lise t&eacute;cnica preliminar,
                permitindo que o Controlador cumpra seus prazos perante a ANPD e os titulares afetados.
              </li>
              <li>
                <strong>Fornecer informa&ccedil;&otilde;es detalhadas</strong> sobre o incidente, incluindo:
                natureza dos dados afetados, categorias e n&uacute;mero aproximado de titulares,
                medidas t&eacute;cnicas adotadas e provid&ecirc;ncias para mitigar os efeitos.
              </li>
              <li>
                <strong>Cooperar com o Controlador</strong> para o cumprimento de obriga&ccedil;&otilde;es de
                comunica&ccedil;&atilde;o &agrave; ANPD e aos titulares afetados (Art. 48 da LGPD).
              </li>
              <li>
                <strong>Documentar o incidente</strong> nos registros internos de auditoria, incluindo
                causa raiz, impacto e a&ccedil;&otilde;es corretivas implementadas.
              </li>
              <li>
                <strong>Implementar medidas corretivas</strong> para prevenir a recorr&ecirc;ncia.
              </li>
            </ul>
          </section>

          {/* 9. Direitos dos Titulares */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              9. Direitos dos Titulares
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O Operador auxiliar&aacute; o Controlador no atendimento de solicita&ccedil;&otilde;es de titulares
              relativas ao exerc&iacute;cio de seus direitos previstos nos artigos 17 a 22 da LGPD:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { title: 'Confirma\u00e7\u00e3o e Acesso', desc: 'Consulta de exist\u00eancia de tratamento e acesso aos dados.' },
                { title: 'Corre\u00e7\u00e3o', desc: 'Atualiza\u00e7\u00e3o de dados incompletos, inexatos ou desatualizados.' },
                { title: 'Anonimiza\u00e7\u00e3o ou Exclus\u00e3o', desc: 'Elimina\u00e7\u00e3o de dados desnecess\u00e1rios ou excessivos.' },
                { title: 'Portabilidade', desc: 'Exporta\u00e7\u00e3o em formatos interoper\u00e1veis (CSV, JSON, PDF).' },
                { title: 'Revoga\u00e7\u00e3o', desc: 'Revoga\u00e7\u00e3o de consentimento a qualquer momento.' },
                { title: 'Oposi\u00e7\u00e3o', desc: 'Oposi\u00e7\u00e3o ao tratamento irregular de dados.' },
              ].map((right) => (
                <div key={right.title} className="border border-gray-200 rounded-md p-3">
                  <p className="text-sm font-medium text-gray-800">{right.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{right.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma disponibiliza funcionalidade de exporta&ccedil;&atilde;o de dados diretamente no sistema,
              facilitando o atendimento de solicita&ccedil;&otilde;es de portabilidade pelo Controlador. Solicita&ccedil;&otilde;es
              de exclus&atilde;o ser&atilde;o atendidas em at&eacute; 30 dias, respeitando-se obriga&ccedil;&otilde;es legais de reten&ccedil;&atilde;o
              (e.g., prontu&aacute;rios odontol&oacute;gicos por 20 anos).
            </p>
          </section>

          {/* 10. Auditoria e Conformidade */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              10. Auditoria e Conformidade
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O Operador disponibilizar&aacute; ao Controlador as informa&ccedil;&otilde;es necess&aacute;rias para
              demonstrar conformidade com as obriga&ccedil;&otilde;es deste Acordo, incluindo:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Logs de auditoria:</strong> Registros imut&aacute;veis de acesso e altera&ccedil;&atilde;o de dados,
                com rastreamento de IP, usu&aacute;rio e timestamp, dispon&iacute;veis na plataforma.
              </li>
              <li>
                <strong>Relat&oacute;rios de seguran&ccedil;a:</strong> Dashboard com m&eacute;tricas de seguran&ccedil;a,
                eventos e alertas, acess&iacute;vel a administradores da cl&iacute;nica.
              </li>
              <li>
                <strong>Direito de auditoria:</strong> O Controlador poder&aacute; solicitar auditoria das
                pr&aacute;ticas de seguran&ccedil;a do Operador, mediante aviso pr&eacute;vio de 30 dias, limitada a
                uma auditoria por ano, salvo em caso de incidente. A auditoria poder&aacute; ser realizada
                por auditor independente indicado pelo Controlador, desde que: (a) n&atilde;o comprometa
                a seguran&ccedil;a da infraestrutura; (b) n&atilde;o envolva acesso direto ao c&oacute;digo-fonte ou
                a dados de outros clientes; (c) seja realizada durante hor&aacute;rio comercial; e
                (d) o escopo seja previamente acordado entre as partes.
              </li>
              <li>
                <strong>Custos da auditoria:</strong> Os custos da auditoria ser&atilde;o de responsabilidade
                do Controlador, exceto quando a auditoria revelar descumprimento relevante das
                obriga&ccedil;&otilde;es deste Acordo por parte do Operador, caso em que os custos razo&aacute;veis
                ser&atilde;o arcados pelo Operador.
              </li>
              <li>
                <strong>Certifica&ccedil;&otilde;es:</strong> O Operador manter&aacute; documenta&ccedil;&atilde;o atualizada sobre
                as medidas de seguran&ccedil;a e certifica&ccedil;&otilde;es dos suboperadores.
              </li>
            </ul>
          </section>

          {/* 11. Vigencia e Rescisao */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              11. Vig&ecirc;ncia e Rescis&atilde;o
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Este Acordo entra em vigor na data de aceite dos Termos de Uso da plataforma
              e permanece v&aacute;lido enquanto durar a rela&ccedil;&atilde;o contratual entre as partes.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Ap&oacute;s o t&eacute;rmino da rela&ccedil;&atilde;o contratual, por qualquer motivo:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                O Operador cessar&aacute; o tratamento de dados em nome do Controlador.
              </li>
              <li>
                O Controlador poder&aacute; exportar todos os seus dados antes do encerramento,
                utilizando as ferramentas de exporta&ccedil;&atilde;o da plataforma.
              </li>
              <li>
                Ap&oacute;s a exporta&ccedil;&atilde;o ou decorrido o prazo de 90 dias do encerramento, o Operador
                eliminar&aacute; os dados do Controlador, salvo quando houver obriga&ccedil;&atilde;o legal aplic&aacute;vel
                ao Operador ou necessidade de reten&ccedil;&atilde;o para defesa em processo administrativo
                ou judicial.
              </li>
              <li>
                O Controlador reconhece que a guarda de prontu&aacute;rios odontol&oacute;gicos pelo prazo
                m&iacute;nimo de 20 anos &eacute; obriga&ccedil;&atilde;o profissional do dentista (CFO), devendo
                este realizar a exporta&ccedil;&atilde;o dos dados antes da elimina&ccedil;&atilde;o definitiva pela
                plataforma. O Operador disponibilizar&aacute; os dados para exporta&ccedil;&atilde;o em formatos
                interoper&aacute;veis (CSV, JSON, PDF) durante todo o per&iacute;odo de 90 dias p&oacute;s-encerramento.
              </li>
              <li>
                As obriga&ccedil;&otilde;es de confidencialidade e seguran&ccedil;a permanecem vigentes
                ap&oacute;s o t&eacute;rmino do Acordo, enquanto o Operador mantiver dados do Controlador.
              </li>
            </ul>
          </section>

          {/* 12. Penalidades */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              12. Penalidades e Responsabilidades
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Em caso de descumprimento das obriga&ccedil;&otilde;es previstas neste Acordo:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                O <strong>Operador</strong> responder&aacute; pelos danos causados pelo tratamento de dados
                realizado em descumprimento &agrave; LGPD ou &agrave;s instru&ccedil;&otilde;es l&iacute;citas do Controlador (Art. 42, &sect;1&ordm;, I).
              </li>
              <li>
                O <strong>Controlador</strong> responder&aacute; pelo tratamento de dados realizado em
                desconformidade com a LGPD, incluindo a coleta sem base legal adequada.
              </li>
              <li>
                Em caso de dano ao titular, a responsabilidade ser&aacute; apurada conforme os
                artigos 42 a 45 da LGPD, podendo ser solid&aacute;ria quando n&atilde;o for poss&iacute;vel
                identificar o respons&aacute;vel direto.
              </li>
              <li>
                O descumprimento grave deste Acordo constitui motivo para rescis&atilde;o contratual,
                sem preju&iacute;zo de eventuais perdas e danos.
              </li>
            </ul>

            <h3 className="text-sm font-semibold text-gray-800 mt-4">Indeniza&ccedil;&atilde;o Cruzada</h3>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                Caso o Controlador sofra san&ccedil;&atilde;o administrativa ou condena&ccedil;&atilde;o judicial
                decorrente de falha comprovada do Operador no cumprimento deste Acordo,
                o Operador indenizar&aacute; o Controlador pelos preju&iacute;zos diretos comprovados.
              </li>
              <li>
                Caso o Operador sofra consequ&ecirc;ncias decorrentes de instru&ccedil;&otilde;es ilegais
                do Controlador, coleta sem base legal ou descumprimento das obriga&ccedil;&otilde;es do
                Controlador previstas neste Acordo, o Controlador indenizar&aacute; o Operador
                pelos preju&iacute;zos diretos comprovados.
              </li>
              <li>
                A responsabilidade de cada parte est&aacute; limitada aos danos diretos e comprovados,
                respeitado o limite de responsabilidade previsto nos Termos de Uso,
                excluindo-se lucros cessantes e danos indiretos, salvo nos casos de dolo ou culpa grave.
              </li>
            </ul>
            <div className="border-l-4 border-red-400 pl-4 bg-red-50/50 p-3 rounded-r-md">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>San&ccedil;&otilde;es administrativas da LGPD:</strong> Ambas as partes reconhecem que a
                ANPD poder&aacute; aplicar san&ccedil;&otilde;es administrativas conforme Art. 52 da LGPD, incluindo
                advert&ecirc;ncia, multa de at&eacute; 2% do faturamento (limitada a R$ 50 milh&otilde;es por
                infra&ccedil;&atilde;o), bloqueio e elimina&ccedil;&atilde;o de dados pessoais.
              </p>
            </div>
          </section>

          {/* 13. Cooperacao em Fiscalizacao */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              13. Coopera&ccedil;&atilde;o em Fiscaliza&ccedil;&atilde;o
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Em caso de fiscaliza&ccedil;&atilde;o, auditoria ou solicita&ccedil;&atilde;o de informa&ccedil;&otilde;es pela ANPD
              ou outro &oacute;rg&atilde;o competente, ambas as partes se comprometem a:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                Cooperar mutuamente, fornecendo documenta&ccedil;&atilde;o, esclarecimentos e acesso
                a registros no prazo estipulado pela autoridade.
              </li>
              <li>
                Comunicar a outra parte sobre a fiscaliza&ccedil;&atilde;o em prazo razo&aacute;vel, salvo
                quando houver determina&ccedil;&atilde;o legal de sigilo.
              </li>
              <li>
                Manter documenta&ccedil;&atilde;o organizada e acess&iacute;vel para demonstrar conformidade
                com a LGPD e com as obriga&ccedil;&otilde;es deste Acordo.
              </li>
            </ul>
          </section>

          {/* 14. Lei Aplicavel e Foro */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              14. Lei Aplic&aacute;vel e Foro
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Este Acordo &eacute; regido pelas leis da Rep&uacute;blica Federativa do Brasil, em especial
              pela Lei n&ordm; 13.709/2018 (LGPD), pelo C&oacute;digo Civil e demais legisla&ccedil;&otilde;es aplic&aacute;veis.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Fica eleito o foro da Comarca de S&atilde;o Paulo, Estado de S&atilde;o Paulo, para dirimir
              quaisquer controv&eacute;rsias oriundas deste Acordo, com ren&uacute;ncia expressa a qualquer
              outro, por mais privilegiado que seja.
            </p>
          </section>

          {/* Anexo - Descricao do Tratamento */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Anexo I &mdash; Descri&ccedil;&atilde;o do Tratamento de Dados
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Detalhamento do tratamento de dados realizado pelo Operador em nome do Controlador:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4 font-medium text-gray-800 align-top w-1/3">Categorias de Titulares</td>
                    <td className="py-3 text-gray-600">
                      Pacientes da cl&iacute;nica, profissionais de sa&uacute;de (dentistas), funcion&aacute;rios
                      administrativos (secret&aacute;rias), administradores e respons&aacute;veis legais de menores.
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4 font-medium text-gray-800 align-top">Dados Pessoais</td>
                    <td className="py-3 text-gray-600">
                      Nome, CPF (criptografado), RG (criptografado), data de nascimento, g&ecirc;nero,
                      e-mail, telefone, endere&ccedil;o, CRO (dentistas), fun&ccedil;&atilde;o na cl&iacute;nica.
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4 font-medium text-gray-800 align-top">Dados Sens&iacute;veis</td>
                    <td className="py-3 text-gray-600">
                      Hist&oacute;rico odontol&oacute;gico, anamnese cl&iacute;nica completa, planos de tratamento,
                      registros de consultas, imagens e radiografias, transcri&ccedil;&otilde;es de consultas (IA).
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4 font-medium text-gray-800 align-top">Dados Financeiros</td>
                    <td className="py-3 text-gray-600">
                      Hist&oacute;rico de pagamentos, dados de cobran&ccedil;a, notas fiscais,
                      dados de assinatura. Cart&otilde;es de cr&eacute;dito gerenciados exclusivamente pelo
                      provedor de pagamentos (n&atilde;o armazenados pelo Operador).
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4 font-medium text-gray-800 align-top">Finalidades</td>
                    <td className="py-3 text-gray-600">
                      Gest&atilde;o de prontu&aacute;rios, agendamento, controle financeiro, comunica&ccedil;&atilde;o com
                      pacientes, assist&ecirc;ncia por IA (transcri&ccedil;&atilde;o, sugest&otilde;es cl&iacute;nicas, an&aacute;lise
                      cont&aacute;bil), gera&ccedil;&atilde;o de relat&oacute;rios e cumprimento de obriga&ccedil;&otilde;es regulat&oacute;rias.
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-3 pr-4 font-medium text-gray-800 align-top">Dura&ccedil;&atilde;o</td>
                    <td className="py-3 text-gray-600">
                      Enquanto durar a rela&ccedil;&atilde;o contratual, acrescido de 90 dias para exporta&ccedil;&atilde;o
                      p&oacute;s-encerramento. Reten&ccedil;&otilde;es legais: prontu&aacute;rios 20 anos (CFO), dados fiscais
                      5 anos, logs de auditoria 2 anos (salvo necessidade de reten&ccedil;&atilde;o
                      para defesa em processo judicial ou administrativo).
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-gray-800 align-top">Medidas de Seguran&ccedil;a</td>
                    <td className="py-3 text-gray-600">
                      TLS 1.2+, AES-256, pgcrypto, RBAC, RLS, JWT, audit logs imut&aacute;veis,
                      senhas 12+ caracteres, CSP/HSTS, rate limiting, pseudonimiza&ccedil;&atilde;o para IA,
                      CORS whitelist, valida&ccedil;&atilde;o de entrada.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-gray-200 pt-6 mt-10 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-500 space-y-1">
                <p><strong>Vers&atilde;o:</strong> 1.0</p>
                <p><strong>&Uacute;ltima atualiza&ccedil;&atilde;o:</strong> 23 de fevereiro de 2026</p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  to="/privacidade"
                  className="text-sm text-primary hover:underline"
                >
                  Pol&iacute;tica de Privacidade
                </Link>
                <Link
                  to="/termos"
                  className="text-sm text-primary hover:underline"
                >
                  Termos de Uso
                </Link>
                <Link
                  to="/seguranca-informacao"
                  className="text-sm text-primary hover:underline"
                >
                  Seguran&ccedil;a da Informa&ccedil;&atilde;o
                </Link>
                <Link
                  to="/"
                  className="text-sm text-primary hover:underline"
                >
                  &larr; Voltar ao aplicativo
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default DPA;
