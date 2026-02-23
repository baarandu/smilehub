import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
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
              Pol&iacute;tica de Privacidade
            </h1>
            <p className="text-gray-500 text-sm">
              Em conformidade com a Lei Geral de Prote&ccedil;&atilde;o de Dados (LGPD - Lei n&ordm; 13.709/2018)
            </p>
          </div>

          {/* Resumo em linguagem simples */}
          <section className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-2">
            <h2 className="text-base font-semibold text-gray-900">Em poucas palavras</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              O <strong>Organiza Odonto</strong> &eacute; uma plataforma de gest&atilde;o para cl&iacute;nicas
              odontol&oacute;gicas. N&oacute;s <strong>processamos dados em nome da sua cl&iacute;nica</strong> (somos
              operadores, n&atilde;o controladores). Usamos criptografia, controle de acesso rigoroso
              e nunca vendemos seus dados. Funcionalidades de IA s&atilde;o opcionais e requerem
              consentimento. Voc&ecirc; pode exportar ou excluir seus dados a qualquer momento.
            </p>
          </section>

          {/* 1. Identificacao — Plataforma vs Clinica */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              1. Identifica&ccedil;&atilde;o: Plataforma e Controlador
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm space-y-1">
                <p className="font-semibold text-blue-900 mb-2">Operadora de Dados (Plataforma)</p>
                <p className="text-blue-800"><strong>Plataforma:</strong> Organiza Odonto</p>
                <p className="text-blue-800"><strong>Raz&atilde;o Social:</strong> [Raz&atilde;o Social da Empresa]</p>
                <p className="text-blue-800"><strong>CNPJ:</strong> [XX.XXX.XXX/XXXX-XX]</p>
                <p className="text-blue-800"><strong>E-mail:</strong> suporte@organizaodonto.app</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm space-y-1">
                <p className="font-semibold text-gray-900 mb-2">Controladora de Dados (Cl&iacute;nica)</p>
                <p className="text-gray-700">
                  Cada cl&iacute;nica ou consult&oacute;rio que utiliza a plataforma &eacute; o <strong>controlador</strong> dos
                  dados pessoais de seus pacientes, conforme a LGPD.
                </p>
                <p className="text-gray-700">
                  A cl&iacute;nica define as finalidades e as bases legais para o tratamento dos dados.
                </p>
              </div>
            </div>

            <div className="border-l-4 border-blue-400 pl-4 bg-blue-50/50 p-3 rounded-r-md">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Importante:</strong> O Organiza Odonto atua exclusivamente como <strong>operadora
                de dados</strong>, realizando o tratamento conforme instru&ccedil;&otilde;es do controlador (cl&iacute;nica).
                A plataforma n&atilde;o &eacute; respons&aacute;vel pelas decis&otilde;es cl&iacute;nicas, pela coleta inicial de
                dados junto ao paciente ou pela defini&ccedil;&atilde;o da base legal do tratamento &mdash; essas
                responsabilidades s&atilde;o do controlador. Esta pol&iacute;tica descreve como a plataforma
                processa, armazena e protege os dados em nome das cl&iacute;nicas.
                A plataforma atua mediante contrato espec&iacute;fico de tratamento de dados (DPA)
                firmado com cada controlador, detalhando responsabilidades, medidas de
                seguran&ccedil;a e fluxos de comunica&ccedil;&atilde;o.
              </p>
            </div>
          </section>

          {/* 2. Dados Coletados */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              2. Dados Coletados
            </h2>

            <h3 className="text-base font-medium text-gray-800 mt-4">2.1 Dados de Pacientes</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Dados inseridos pela cl&iacute;nica (controladora) na plataforma:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-medium text-gray-800 text-sm mb-2">Dados de Identifica&ccedil;&atilde;o</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Nome completo</li>
                  <li>CPF (armazenado com criptografia)</li>
                  <li>RG (armazenado com criptografia)</li>
                  <li>Data de nascimento</li>
                  <li>G&ecirc;nero</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-medium text-gray-800 text-sm mb-2">Dados de Contato</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>E-mail</li>
                  <li>Telefone / WhatsApp</li>
                  <li>Endere&ccedil;o residencial</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-medium text-gray-800 text-sm mb-2">Dados de Sa&uacute;de (Sens&iacute;veis)</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Hist&oacute;rico odontol&oacute;gico</li>
                  <li>Anamnese cl&iacute;nica</li>
                  <li>Planos de tratamento</li>
                  <li>Registros de consultas</li>
                  <li>Imagens e radiografias</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-medium text-gray-800 text-sm mb-2">Dados Financeiros</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Hist&oacute;rico de pagamentos</li>
                  <li>Dados de cobran&ccedil;a</li>
                  <li>Notas fiscais</li>
                </ul>
              </div>
            </div>

            <h3 className="text-base font-medium text-gray-800 mt-6">2.2 Dados de Usu&aacute;rios da Plataforma</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Dados dos profissionais (dentistas, secret&aacute;rias, administradores) que utilizam o sistema:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-medium text-gray-800 text-sm mb-2">Dados Profissionais</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Nome completo</li>
                  <li>E-mail de acesso</li>
                  <li>CPF</li>
                  <li>CRO (para dentistas)</li>
                  <li>Fun&ccedil;&atilde;o na cl&iacute;nica</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-medium text-gray-800 text-sm mb-2">Dados de Uso e Acesso</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Endere&ccedil;o IP e User Agent</li>
                  <li>Registros de login e atividades</li>
                  <li>Logs de auditoria</li>
                  <li>Dados de assinatura e pagamento</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Dados de Menores */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              3. Dados de Crian&ccedil;as e Adolescentes
            </h2>
            <div className="border-l-4 border-amber-400 pl-4 bg-amber-50/50 p-3 rounded-r-md">
              <p className="text-sm text-gray-700 leading-relaxed">
                Cl&iacute;nicas odontol&oacute;gicas frequentemente atendem pacientes menores de idade.
                Em conformidade com o <strong>Art. 14 da LGPD</strong>, o tratamento de dados pessoais
                de crian&ccedil;as e adolescentes deve ser realizado em seu melhor interesse e requer
                o <strong>consentimento espec&iacute;fico e em destaque de pelo menos um dos pais ou
                responsável legal</strong>.
              </p>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma disponibiliza campos espec&iacute;ficos para o registro do respons&aacute;vel legal
              do menor e mecanismos para coleta e armazenamento do consentimento. &Eacute; responsabilidade
              da cl&iacute;nica (controladora) garantir a obten&ccedil;&atilde;o do consentimento antes de inserir
              dados de menores no sistema.
            </p>
          </section>

          {/* 4. Finalidade do Tratamento */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              4. Finalidade do Tratamento
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Os dados pessoais s&atilde;o tratados para as seguintes finalidades:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Presta&ccedil;&atilde;o de servi&ccedil;os de sa&uacute;de:</strong> Gerenciamento de prontu&aacute;rios,
                agendamento de consultas, acompanhamento de tratamentos e comunica&ccedil;&atilde;o com pacientes.
              </li>
              <li>
                <strong>Gest&atilde;o financeira:</strong> Emiss&atilde;o de cobran&ccedil;as, controle de pagamentos,
                gera&ccedil;&atilde;o de relat&oacute;rios financeiros e cumprimento de obriga&ccedil;&otilde;es fiscais.
              </li>
              <li>
                <strong>Obriga&ccedil;&otilde;es legais e regulat&oacute;rias:</strong> Cumprimento de exig&ecirc;ncias do
                Conselho Federal de Odontologia (CFO), Anvisa e demais &oacute;rg&atilde;os reguladores.
              </li>
              <li>
                <strong>Melhoria dos servi&ccedil;os:</strong> An&aacute;lise agregada e anonimizada para aprimoramento
                da plataforma e da experi&ecirc;ncia do usu&aacute;rio.
              </li>
              <li>
                <strong>Assist&ecirc;ncia com intelig&ecirc;ncia artificial:</strong> Transcri&ccedil;&atilde;o de consultas,
                sugest&otilde;es cl&iacute;nicas e aux&iacute;lio administrativo, sempre com supervis&atilde;o humana obrigat&oacute;ria.
              </li>
            </ul>
          </section>

          {/* 5. Base Legal */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              5. Base Legal (LGPD, Art. 7&ordm; e Art. 11)
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O tratamento de dados pessoais realizado pela plataforma fundamenta-se nas seguintes bases legais:
            </p>
            <div className="space-y-3">
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Consentimento (Art. 7&ordm;, I / Art. 11, I para dados sens&iacute;veis)</p>
                <p className="text-sm text-gray-600">
                  Para finalidades espec&iacute;ficas, como o uso de funcionalidades de intelig&ecirc;ncia artificial
                  que envolvam dados de sa&uacute;de, &eacute; exigido consentimento espec&iacute;fico e em destaque do
                  titular ou de seu respons&aacute;vel legal (Art. 11, I). O consentimento pode ser
                  revogado a qualquer momento.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Execu&ccedil;&atilde;o de contrato (Art. 7&ordm;, V)</p>
                <p className="text-sm text-gray-600">
                  Necess&aacute;rio para a presta&ccedil;&atilde;o dos servi&ccedil;os contratados pela cl&iacute;nica, incluindo
                  gest&atilde;o de pacientes, agendamentos e cobran&ccedil;as.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Obriga&ccedil;&atilde;o legal (Art. 7&ordm;, II)</p>
                <p className="text-sm text-gray-600">
                  Cumprimento de obriga&ccedil;&otilde;es legais e regulat&oacute;rias, como manuten&ccedil;&atilde;o de prontu&aacute;rios
                  pelo prazo m&iacute;nimo de 20 anos (CFO) e obriga&ccedil;&otilde;es fiscais.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Tutela da sa&uacute;de (Art. 7&ordm;, VIII / Art. 11, II, f)</p>
                <p className="text-sm text-gray-600">
                  Tratamento de dados sens&iacute;veis de sa&uacute;de para a presta&ccedil;&atilde;o de servi&ccedil;os
                  odontol&oacute;gicos, em procedimento realizado por profissional de sa&uacute;de habilitado.
                </p>
              </div>
              <div className="border-l-4 border-gray-300 pl-4">
                <p className="text-sm font-medium text-gray-800">Dados anonimizados (Art. 12)</p>
                <p className="text-sm text-gray-600">
                  Dados efetivamente anonimizados, nos termos do Art. 12 da LGPD, n&atilde;o s&atilde;o
                  considerados dados pessoais, desde que o processo de anonimiza&ccedil;&atilde;o seja
                  irrevers&iacute;vel com os meios t&eacute;cnicos razo&aacute;veis dispon&iacute;veis. Tais dados podem
                  ser utilizados para fins estat&iacute;sticos e de melhoria da plataforma.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Compartilhamento e Transferencia Internacional */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              6. Compartilhamento de Dados e Transfer&ecirc;ncia Internacional
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Os dados pessoais podem ser compartilhados com suboperadores estritamente para
              as finalidades descritas nesta pol&iacute;tica. As categorias de suboperadores utilizados s&atilde;o:
            </p>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Provedor de Infraestrutura e Banco de Dados</p>
                <p className="text-sm text-gray-600 mt-1">
                  Armazenamento seguro de dados em servidores com criptografia em repouso e em tr&acirc;nsito.
                  O provedor possui certifica&ccedil;&otilde;es de seguran&ccedil;a reconhecidas internacionalmente (SOC 2 Type II).
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Provedor de Processamento de Pagamentos</p>
                <p className="text-sm text-gray-600 mt-1">
                  Processamento de cobran&ccedil;as e assinaturas. Certificado PCI DSS Level 1.
                  Dados de cart&atilde;o de cr&eacute;dito s&atilde;o gerenciados exclusivamente pelo provedor de pagamentos
                  e nunca armazenados em nossos servidores.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Provedor de Intelig&ecirc;ncia Artificial</p>
                <p className="text-sm text-gray-600 mt-1">
                  Utilizado para transcri&ccedil;&atilde;o de &aacute;udio de consultas e assist&ecirc;ncia cl&iacute;nica via texto.
                  Antes do envio, a plataforma aplica t&eacute;cnicas de <em>pseudonimiza&ccedil;&atilde;o</em> e <em>masking</em> para
                  reduzir a identifica&ccedil;&atilde;o direta, removendo nomes, CPFs, endere&ccedil;os e demais
                  dados identific&aacute;veis. O provedor de IA n&atilde;o
                  utiliza dados enviados via API para treinamento de modelos (conforme contrato corporativo).
                  O uso de funcionalidades de IA requer consentimento expl&iacute;cito do paciente e pode ser
                  recusado individualmente sem preju&iacute;zo ao atendimento.
                </p>
              </div>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed">
              N&atilde;o realizamos venda, loca&ccedil;&atilde;o ou compartilhamento de dados pessoais com terceiros
              para finalidades de marketing ou publicidade.
            </p>

            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma poder&aacute; contratar novos suboperadores, garantindo que todos estejam
              sujeitos a obriga&ccedil;&otilde;es de prote&ccedil;&atilde;o de dados equivalentes &agrave;s descritas nesta pol&iacute;tica.
              Altera&ccedil;&otilde;es relevantes nos suboperadores ser&atilde;o comunicadas aos controladores.
            </p>

            <p className="text-gray-600 text-sm leading-relaxed">
              A cl&iacute;nica (controladora) &eacute; respons&aacute;vel por verificar se o uso da plataforma
              atende &agrave;s normas espec&iacute;ficas do seu Conselho Regional de Odontologia (CRO)
              e demais regulamenta&ccedil;&otilde;es profissionais aplic&aacute;veis.
            </p>

            {/* Transferencia Internacional */}
            <div className="border-l-4 border-amber-400 pl-4 bg-amber-50/50 p-3 rounded-r-md mt-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Transfer&ecirc;ncia Internacional de Dados (LGPD, Art. 33)</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Alguns suboperadores podem processar dados em servidores localizados fora
                do Brasil. Essas transfer&ecirc;ncias s&atilde;o realizadas com base nas seguintes salvaguardas:
              </p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside mt-2">
                <li>Cl&aacute;usulas contratuais padr&atilde;o que garantem n&iacute;vel adequado de prote&ccedil;&atilde;o</li>
                <li>Certifica&ccedil;&otilde;es de seguran&ccedil;a reconhecidas internacionalmente</li>
                <li>Compromisso contratual de n&atilde;o utilizar dados para fins pr&oacute;prios</li>
                <li>Pseudonimiza&ccedil;&atilde;o e <em>masking</em> pr&eacute;vios para dados enviados a servi&ccedil;os de IA</li>
              </ul>
            </div>
          </section>

          {/* 7. Uso de Inteligencia Artificial */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              7. Uso de Intelig&ecirc;ncia Artificial
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma oferece funcionalidades opcionais de intelig&ecirc;ncia artificial para
              aux&iacute;lio ao profissional de sa&uacute;de:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Transcri&ccedil;&atilde;o de consultas:</strong> Convers&atilde;o de &aacute;udio em texto. O &aacute;udio
                &eacute; processado e descartado ap&oacute;s a transcri&ccedil;&atilde;o. N&atilde;o &eacute; armazenado pelo provedor de IA.
              </li>
              <li>
                <strong>Assistente cl&iacute;nico (Dentista IA):</strong> Sugest&otilde;es baseadas em texto, com
                envio de dados pseudonimizados. Nomes, CPFs e endere&ccedil;os s&atilde;o removidos antes do processamento.
              </li>
              <li>
                <strong>Assistente cont&aacute;bil:</strong> An&aacute;lise de dados financeiros agregados para
                aux&iacute;lio em obriga&ccedil;&otilde;es fiscais.
              </li>
            </ul>

            <div className="border-l-4 border-red-400 pl-4 bg-red-50/50 p-3 rounded-r-md">
              <p className="text-sm font-semibold text-gray-800 mb-1">Aviso importante sobre IA</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                As funcionalidades de intelig&ecirc;ncia artificial s&atilde;o <strong>exclusivamente assistivas</strong> e
                <strong> n&atilde;o substituem o julgamento cl&iacute;nico do profissional de sa&uacute;de</strong>. Todas as
                sugest&otilde;es geradas por IA requerem revis&atilde;o e valida&ccedil;&atilde;o pelo dentista respons&aacute;vel.
                A responsabilidade por diagn&oacute;sticos, planos de tratamento e decis&otilde;es cl&iacute;nicas &eacute;
                integralmente do profissional de sa&uacute;de habilitado. O paciente pode recusar
                o uso de IA sem qualquer preju&iacute;zo ao seu atendimento.
              </p>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma <strong>n&atilde;o realiza decis&otilde;es automatizadas</strong> que produzam efeitos
              jur&iacute;dicos ou significativamente impactantes aos titulares, nos termos do
              Art. 20 da LGPD. Todas as funcionalidades de IA s&atilde;o de car&aacute;ter assistivo
              e dependem de a&ccedil;&atilde;o humana para produ&ccedil;&atilde;o de efeitos.
            </p>
          </section>

          {/* 8. Direitos do Titular */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              8. Direitos do Titular dos Dados
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Em conformidade com os artigos 17 a 22 da LGPD, o titular dos dados pessoais tem direito a:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { title: 'Confirma\u00e7\u00e3o e Acesso', desc: 'Confirmar a exist\u00eancia de tratamento e acessar seus dados pessoais.' },
                { title: 'Corre\u00e7\u00e3o', desc: 'Solicitar a corre\u00e7\u00e3o de dados incompletos, inexatos ou desatualizados.' },
                { title: 'Anonimiza\u00e7\u00e3o ou Exclus\u00e3o', desc: 'Solicitar a anonimiza\u00e7\u00e3o, bloqueio ou elimina\u00e7\u00e3o de dados desnecess\u00e1rios.' },
                { title: 'Portabilidade', desc: 'Solicitar a portabilidade dos dados a outro prestador de servi\u00e7os.' },
                { title: 'Revoga\u00e7\u00e3o do Consentimento', desc: 'Revogar o consentimento previamente concedido, a qualquer momento.' },
                { title: 'Oposi\u00e7\u00e3o', desc: 'Opor-se ao tratamento realizado com base em hip\u00f3teses de dispensa de consentimento, se irregular.' },
              ].map((right) => (
                <div key={right.title} className="border border-gray-200 rounded-md p-3">
                  <p className="text-sm font-medium text-gray-800">{right.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{right.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para exercer qualquer desses direitos, entre em contato com o Encarregado de Dados
              (DPO) atrav&eacute;s do e-mail indicado na se&ccedil;&atilde;o 14 desta pol&iacute;tica. A plataforma
              disponibiliza funcionalidade de exporta&ccedil;&atilde;o de dados diretamente no sistema,
              em formatos interoper&aacute;veis (CSV, JSON e PDF) para garantir a portabilidade.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Caso o titular n&atilde;o fique satisfeito com a resposta ou a solu&ccedil;&atilde;o oferecida,
              tem o direito de apresentar reclama&ccedil;&atilde;o &agrave; <strong>Autoridade Nacional de
              Prote&ccedil;&atilde;o de Dados (ANPD)</strong>, conforme previsto na LGPD.
            </p>
          </section>

          {/* 9. Retencao de Dados */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              9. Reten&ccedil;&atilde;o de Dados
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Os dados pessoais s&atilde;o retidos pelos seguintes per&iacute;odos:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Prontu&aacute;rios odontol&oacute;gicos:</strong> M&iacute;nimo de 20 anos ap&oacute;s o &uacute;ltimo
                atendimento, conforme exig&ecirc;ncia do Conselho Federal de Odontologia.
              </li>
              <li>
                <strong>Dados financeiros e fiscais:</strong> 5 anos ap&oacute;s o exerc&iacute;cio fiscal
                correspondente, conforme legisla&ccedil;&atilde;o tribut&aacute;ria.
              </li>
              <li>
                <strong>Dados de conta e perfil:</strong> Enquanto a conta estiver ativa.
                Ap&oacute;s solicita&ccedil;&atilde;o de exclus&atilde;o, os dados s&atilde;o removidos em at&eacute; 30 dias,
                exceto quando houver obriga&ccedil;&atilde;o legal de reten&ccedil;&atilde;o.
              </li>
              <li>
                <strong>Logs de auditoria:</strong> 2 anos, para fins de seguran&ccedil;a e conformidade.
              </li>
              <li>
                <strong>Dados de IA (transcri&ccedil;&otilde;es):</strong> Retidos enquanto vinculados ao
                prontu&aacute;rio. Dados tempor&aacute;rios de processamento s&atilde;o descartados ap&oacute;s 24 horas.
              </li>
            </ul>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma executa rotinas autom&aacute;ticas de limpeza de dados expirados, garantindo
              que informa&ccedil;&otilde;es n&atilde;o necess&aacute;rias sejam eliminadas de forma segura.
            </p>
          </section>

          {/* 10. Seguranca */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              10. Seguran&ccedil;a dos Dados
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Adotamos medidas t&eacute;cnicas e administrativas para proteger os dados pessoais contra
              acessos n&atilde;o autorizados, situa&ccedil;&otilde;es acidentais ou il&iacute;citas de destrui&ccedil;&atilde;o, perda,
              altera&ccedil;&atilde;o ou comunica&ccedil;&atilde;o:
            </p>

            <h3 className="text-sm font-semibold text-gray-800 mt-2">Medidas T&eacute;cnicas</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'Criptografia em repouso e em tr\u00e2nsito (TLS 1.2+)',
                'Criptografia adicional para dados sens\u00edveis (CPF, RG)',
                'Controle de acesso baseado em fun\u00e7\u00f5es (RBAC)',
                'Row Level Security (RLS) no banco de dados',
                'Autentica\u00e7\u00e3o JWT com tokens de curta dura\u00e7\u00e3o',
                'Registro de auditoria (audit logs) imut\u00e1veis',
                'Pol\u00edtica de senhas fortes (m\u00ednimo 12 caracteres)',
                'Headers de seguran\u00e7a (CSP, HSTS, X-Frame-Options)',
                'Pseudonimiza\u00e7\u00e3o e minimiza\u00e7\u00e3o de dados antes do envio para servi\u00e7os de IA',
                'Limita\u00e7\u00e3o de taxa (rate limiting) em todas as APIs',
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
                'Acordos de confidencialidade (NDA) com todos os colaboradores e suboperadores',
                'Acesso restrito ao banco de dados somente para pessoal autorizado',
                'Treinamento da equipe interna sobre prote\u00e7\u00e3o de dados e sigilo profissional',
                'Revis\u00e3o peri\u00f3dica de permiss\u00f5es de acesso',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-primary mt-0.5 font-bold">&bull;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 11. Backup e Continuidade */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              11. Backup e Continuidade
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para garantir a disponibilidade e a integridade dos dados &mdash; especialmente prontu&aacute;rios
              odontol&oacute;gicos, cuja perda pode acarretar consequ&ecirc;ncias legais &mdash; a plataforma adota:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Backups automatizados di&aacute;rios</strong> com reten&ccedil;&atilde;o m&iacute;nima de 30 dias,
                gerenciados pelo provedor de infraestrutura.
              </li>
              <li>
                <strong>Redund&acirc;ncia geogr&aacute;fica</strong> para prote&ccedil;&atilde;o contra falhas de hardware
                ou desastres no data center.
              </li>
              <li>
                <strong>Plano de recupera&ccedil;&atilde;o de desastres</strong> com procedimentos documentados
                para restaura&ccedil;&atilde;o de dados em caso de incidente.
              </li>
              <li>
                <strong>Funcionalidade de exporta&ccedil;&atilde;o</strong> que permite &agrave; cl&iacute;nica baixar
                seus dados a qualquer momento em formatos interoper&aacute;veis (CSV, JSON, PDF),
                garantindo portabilidade e controle conforme Art. 18, V da LGPD.
              </li>
            </ul>
          </section>

          {/* 12. Incidentes de Seguranca */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              12. Incidentes de Seguran&ccedil;a
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Em conformidade com o <strong>Art. 48 da LGPD</strong>, em caso de incidente de seguran&ccedil;a
              que possa acarretar risco ou dano relevante aos titulares de dados pessoais, a plataforma
              se compromete a:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Notificar o controlador (cl&iacute;nica) em at&eacute; 48 horas</strong> ap&oacute;s a
                confirma&ccedil;&atilde;o do incidente, conforme definido no Acordo de Processamento
                de Dados (DPA), para que este cumpra suas obriga&ccedil;&otilde;es de comunica&ccedil;&atilde;o
                perante a ANPD e os pacientes afetados.
              </li>
              <li>
                <strong>Comunicar a Autoridade Nacional de Prote&ccedil;&atilde;o de Dados (ANPD)</strong> quando
                aplic&aacute;vel, descrevendo a natureza dos dados afetados, os titulares envolvidos,
                as medidas t&eacute;cnicas adotadas e as provid&ecirc;ncias para mitigar os efeitos do incidente.
              </li>
              <li>
                <strong>Documentar o incidente</strong> nos registros internos de auditoria, incluindo
                causa, impacto e a&ccedil;&otilde;es corretivas implementadas.
              </li>
              <li>
                <strong>Implementar medidas corretivas</strong> para prevenir a recorr&ecirc;ncia do incidente.
              </li>
            </ul>
          </section>

          {/* 13. Cookies */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              13. Cookies e Tecnologias de Rastreamento
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma utiliza cookies estritamente necess&aacute;rios para o funcionamento do sistema,
              incluindo tokens de autentica&ccedil;&atilde;o e prefer&ecirc;ncias de sess&atilde;o. N&atilde;o utilizamos cookies
              de rastreamento, publicidade ou an&aacute;lise comportamental de terceiros.
            </p>
          </section>

          {/* 14. Contato do DPO */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              14. Encarregado de Dados (DPO)
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para quest&otilde;es relacionadas ao tratamento de dados pessoais, exerc&iacute;cio de direitos
              ou d&uacute;vidas sobre esta pol&iacute;tica, entre em contato com nosso Encarregado de Prote&ccedil;&atilde;o
              de Dados:
            </p>
            <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-700 space-y-1">
              <p><strong>Nome:</strong> Equipe de Prote&ccedil;&atilde;o de Dados</p>
              <p><strong>E-mail:</strong> suporte@organizaodonto.app</p>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              As solicita&ccedil;&otilde;es ser&atilde;o respondidas no prazo de 15 dias, conforme
              previsto na LGPD (Art. 19, &sect;2&ordm;).
            </p>
          </section>

          {/* 15. Alteracoes na Politica */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              15. Altera&ccedil;&otilde;es nesta Pol&iacute;tica
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Esta pol&iacute;tica de privacidade pode ser atualizada periodicamente para refletir
              mudan&ccedil;as em nossas pr&aacute;ticas de tratamento de dados ou altera&ccedil;&otilde;es legislativas.
              Notificaremos os usu&aacute;rios sobre mudan&ccedil;as significativas atrav&eacute;s da plataforma
              ou por e-mail com anteced&ecirc;ncia m&iacute;nima de 30 dias. Recomendamos a revis&atilde;o
              peri&oacute;dica deste documento.
            </p>
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
                  to="/termos"
                  className="text-sm text-primary hover:underline"
                >
                  Termos de Uso
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

export default PrivacyPolicy;
