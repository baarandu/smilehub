import { Link } from 'react-router-dom';

const TermsOfService = () => {
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 space-y-10">
          {/* Title */}
          <div className="text-center border-b border-gray-200 pb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Termos de Uso
            </h1>
            <p className="text-gray-500 text-sm">
              Plataforma Organiza Odonto &mdash; Gest&atilde;o Odontol&oacute;gica
            </p>
          </div>

          {/* 1. Definicoes */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              1. Defini&ccedil;&otilde;es
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para os fins destes Termos de Uso, consideram-se as seguintes defini&ccedil;&otilde;es:
            </p>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Plataforma / SaaS</p>
                <p className="text-sm text-gray-600 mt-1">
                  O sistema <strong>Organiza Odonto</strong>, disponibilizado como servi&ccedil;o de software
                  na nuvem (Software as a Service), acess&iacute;vel via navegador web e aplicativo m&oacute;vel,
                  destinado &agrave; gest&atilde;o de cl&iacute;nicas e consult&oacute;rios odontol&oacute;gicos.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Usu&aacute;rio</p>
                <p className="text-sm text-gray-600 mt-1">
                  Pessoa f&iacute;sica que utiliza a Plataforma, incluindo dentistas, administradores,
                  recepcionistas e demais profissionais vinculados &agrave; Cl&iacute;nica.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Cl&iacute;nica</p>
                <p className="text-sm text-gray-600 mt-1">
                  Pessoa jur&iacute;dica ou profissional aut&ocirc;nomo que contrata a Plataforma para
                  gerenciar suas atividades odontol&oacute;gicas, sendo respons&aacute;vel pelos Usu&aacute;rios
                  vinculados &agrave; sua conta.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Dados</p>
                <p className="text-sm text-gray-600 mt-1">
                  Todas as informa&ccedil;&otilde;es inseridas, geradas ou processadas na Plataforma,
                  incluindo dados de pacientes, prontu&aacute;rios, agendamentos, registros financeiros
                  e demais conte&uacute;dos.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Conte&uacute;do de IA</p>
                <p className="text-sm text-gray-600 mt-1">
                  Informa&ccedil;&otilde;es geradas por funcionalidades de intelig&ecirc;ncia artificial da
                  Plataforma, como transcri&ccedil;&otilde;es de consultas, sugest&otilde;es cl&iacute;nicas e aux&iacute;lio
                  administrativo. Tais conte&uacute;dos possuem car&aacute;ter auxiliar e n&atilde;o substituem
                  o julgamento profissional.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Objeto */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              2. Objeto
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A Plataforma Organiza Odonto tem como objeto a disponibiliza&ccedil;&atilde;o de solu&ccedil;&atilde;o
              tecnol&oacute;gica para gest&atilde;o de cl&iacute;nicas e consult&oacute;rios odontol&oacute;gicos, oferecendo
              as seguintes funcionalidades:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Gest&atilde;o de pacientes:</strong> Cadastro, prontu&aacute;rios eletr&ocirc;nicos,
                anamnese cl&iacute;nica e hist&oacute;rico de tratamentos.
              </li>
              <li>
                <strong>Agendamento:</strong> Agenda de consultas, controle de hor&aacute;rios,
                lembretes e gerenciamento de retornos.
              </li>
              <li>
                <strong>Gest&atilde;o financeira:</strong> Controle de pagamentos, cobran&ccedil;as,
                relat&oacute;rios financeiros e fluxo de caixa.
              </li>
              <li>
                <strong>Pr&oacute;teses e laborat&oacute;rio:</strong> Acompanhamento de pedidos de
                pr&oacute;teses, status de produ&ccedil;&atilde;o e integra&ccedil;&atilde;o com laborat&oacute;rios.
              </li>
              <li>
                <strong>Assistente de IA:</strong> Transcri&ccedil;&atilde;o de consultas por voz,
                sugest&otilde;es cl&iacute;nicas, aux&iacute;lio administrativo e agente inteligente para
                dentistas, sempre sob supervis&atilde;o humana.
              </li>
              <li>
                <strong>Relat&oacute;rios e dashboard:</strong> Indicadores de desempenho,
                estat&iacute;sticas de atendimento e vis&atilde;o consolidada da cl&iacute;nica.
              </li>
            </ul>
            <p className="text-gray-600 text-sm leading-relaxed">
              A Plataforma n&atilde;o substitui o julgamento cl&iacute;nico do profissional de sa&uacute;de,
              sendo uma ferramenta auxiliar de gest&atilde;o e organiza&ccedil;&atilde;o.
            </p>
          </section>

          {/* 3. Cadastro e Acesso */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              3. Cadastro e Acesso
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para utilizar a Plataforma, o Usu&aacute;rio dever&aacute; criar uma conta fornecendo
              informa&ccedil;&otilde;es verdadeiras e atualizadas. O acesso &eacute; pessoal e intransfer&iacute;vel.
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                O Usu&aacute;rio &eacute; respons&aacute;vel por manter a confidencialidade de suas credenciais
                de acesso (e-mail e senha), n&atilde;o devendo compartilh&aacute;-las com terceiros.
              </li>
              <li>
                A senha deve conter no m&iacute;nimo 12 caracteres, conforme pol&iacute;tica de seguran&ccedil;a
                da Plataforma.
              </li>
              <li>
                O Usu&aacute;rio deve comunicar imediatamente a Plataforma em caso de uso n&atilde;o
                autorizado de sua conta ou qualquer viola&ccedil;&atilde;o de seguran&ccedil;a.
              </li>
              <li>
                A Cl&iacute;nica &eacute; respons&aacute;vel por gerenciar os acessos de seus colaboradores,
                podendo criar, editar e revogar permiss&otilde;es a qualquer momento.
              </li>
            </ul>
          </section>

          {/* 4. Obrigacoes do Usuario */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              4. Obriga&ccedil;&otilde;es do Usu&aacute;rio
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Ao utilizar a Plataforma, o Usu&aacute;rio compromete-se a:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                Fornecer dados verdadeiros, completos e atualizados no cadastro e na
                utiliza&ccedil;&atilde;o da Plataforma.
              </li>
              <li>
                Utilizar a Plataforma exclusivamente para fins l&iacute;citos e em conformidade
                com a legisla&ccedil;&atilde;o vigente, especialmente as normas do Conselho Federal de
                Odontologia (CFO) e a LGPD.
              </li>
              <li>
                N&atilde;o utilizar a Plataforma para armazenar, transmitir ou processar conte&uacute;do
                il&iacute;cito, ofensivo, difamat&oacute;rio ou que viole direitos de terceiros.
              </li>
              <li>
                Obter o consentimento pr&eacute;vio e expresso dos pacientes para o tratamento de
                seus dados pessoais e dados de sa&uacute;de, conforme exigido pela LGPD.
              </li>
              <li>
                Obter consentimento espec&iacute;fico do paciente antes de utilizar funcionalidades
                de intelig&ecirc;ncia artificial que processem dados do paciente.
              </li>
              <li>
                Manter c&oacute;pias de seguran&ccedil;a (backups) pr&oacute;prias dos dados cr&iacute;ticos,
                utilizando as funcionalidades de exporta&ccedil;&atilde;o disponibilizadas pela Plataforma.
              </li>
              <li>
                N&atilde;o realizar engenharia reversa, descompilar, desmontar ou tentar acessar
                o c&oacute;digo-fonte da Plataforma.
              </li>
              <li>
                N&atilde;o sobrecarregar intencionalmente a infraestrutura da Plataforma com
                requisi&ccedil;&otilde;es excessivas ou automatizadas.
              </li>
            </ul>
          </section>

          {/* 5. Responsabilidades do SaaS */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              5. Responsabilidades da Plataforma
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A Plataforma compromete-se a:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                Manter o servi&ccedil;o dispon&iacute;vel com n&iacute;vel de disponibilidade de 99,5% (SLA),
                exceto durante per&iacute;odos de manuten&ccedil;&atilde;o programada, devidamente comunicados
                com anteced&ecirc;ncia.
              </li>
              <li>
                Implementar e manter medidas de seguran&ccedil;a t&eacute;cnicas e administrativas
                adequadas para prote&ccedil;&atilde;o dos dados, incluindo criptografia, controle de
                acesso e auditoria.
              </li>
              <li>
                Realizar backups regulares dos dados armazenados na Plataforma.
              </li>
              <li>
                Comunicar incidentes de seguran&ccedil;a que possam afetar os dados do Usu&aacute;rio
                no prazo previsto pela LGPD.
              </li>
            </ul>
            <p className="text-gray-600 text-sm leading-relaxed mt-3">
              A Plataforma <strong>n&atilde;o se responsabiliza</strong> por:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                Erros, omiss&otilde;es ou imprecis&otilde;es nos dados inseridos pelo Usu&aacute;rio.
              </li>
              <li>
                Indisponibilidade decorrente de falhas na conex&atilde;o de internet do Usu&aacute;rio,
                provedores de infraestrutura de terceiros ou eventos de for&ccedil;a maior.
              </li>
              <li>
                Decis&otilde;es cl&iacute;nicas ou administrativas tomadas com base em informa&ccedil;&otilde;es
                da Plataforma, incluindo conte&uacute;dos gerados por intelig&ecirc;ncia artificial.
              </li>
              <li>
                Danos resultantes do uso indevido das credenciais de acesso pelo Usu&aacute;rio
                ou terceiros.
              </li>
            </ul>
          </section>

          {/* 6. Propriedade Intelectual */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              6. Propriedade Intelectual
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Todos os direitos de propriedade intelectual sobre a Plataforma, incluindo
              c&oacute;digo-fonte, design, interfaces, algoritmos, marcas, logotipos e
              documenta&ccedil;&atilde;o, pertencem exclusivamente ao provedor do Organiza Odonto.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              A utiliza&ccedil;&atilde;o da Plataforma n&atilde;o confere ao Usu&aacute;rio qualquer direito de
              propriedade intelectual sobre o software, sendo concedida apenas uma
              licen&ccedil;a limitada, n&atilde;o exclusiva, n&atilde;o transfer&iacute;vel e revog&aacute;vel para uso
              da Plataforma durante a vig&ecirc;ncia da assinatura.
            </p>
            <div className="border-l-4 border-primary/60 pl-4 mt-3">
              <p className="text-sm font-medium text-gray-800">Dados do Usu&aacute;rio</p>
              <p className="text-sm text-gray-600 mt-1">
                Os dados inseridos pelo Usu&aacute;rio na Plataforma permanecem de propriedade
                exclusiva da Cl&iacute;nica. O provedor n&atilde;o utilizar&aacute; os dados do Usu&aacute;rio para
                fins pr&oacute;prios, exceto de forma agregada e anonimizada para melhoria do servi&ccedil;o.
              </p>
            </div>
          </section>

          {/* 7. Privacidade e Protecao de Dados */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              7. Privacidade e Prote&ccedil;&atilde;o de Dados
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O tratamento de dados pessoais realizado pela Plataforma est&aacute; em conformidade
              com a Lei Geral de Prote&ccedil;&atilde;o de Dados (LGPD &mdash; Lei n&ordm; 13.709/2018).
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              A Plataforma atua como <strong>operadora</strong> de dados pessoais, processando
              os dados em nome da Cl&iacute;nica (<strong>controladora</strong>), conforme as
              instru&ccedil;&otilde;es e finalidades definidas por esta.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              As pr&aacute;ticas detalhadas de coleta, uso, armazenamento, compartilhamento e
              prote&ccedil;&atilde;o de dados pessoais est&atilde;o descritas em nossa{' '}
              <Link to="/privacidade" className="text-primary hover:underline font-medium">
                Pol&iacute;tica de Privacidade
              </Link>
              , que &eacute; parte integrante destes Termos de Uso.
            </p>
            <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-700 space-y-2">
              <p>
                A Cl&iacute;nica, na qualidade de controladora, &eacute; respons&aacute;vel por:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Obter o consentimento dos pacientes para o tratamento de dados.</li>
                <li>Atender &agrave;s solicita&ccedil;&otilde;es de titulares de dados (acesso, corre&ccedil;&atilde;o, exclus&atilde;o).</li>
                <li>Garantir que o uso da Plataforma esteja em conformidade com a LGPD.</li>
              </ul>
            </div>
          </section>

          {/* 8. Pagamento e Assinatura */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              8. Pagamento e Assinatura
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O acesso &agrave; Plataforma &eacute; realizado mediante assinatura mensal ou anual, conforme
              o plano contratado pela Cl&iacute;nica.
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Ciclo de cobran&ccedil;a:</strong> A cobran&ccedil;a &eacute; realizada de forma recorrente,
                no in&iacute;cio de cada ciclo (mensal ou anual), conforme a data de contrata&ccedil;&atilde;o.
              </li>
              <li>
                <strong>Forma de pagamento:</strong> Cart&atilde;o de cr&eacute;dito, boleto banc&aacute;rio ou
                PIX, conforme disponibilidade. O processamento de pagamentos &eacute; realizado
                por operador terceirizado certificado PCI DSS.
              </li>
              <li>
                <strong>Reajuste:</strong> Os valores da assinatura poder&atilde;o ser reajustados
                anualmente, com comunica&ccedil;&atilde;o pr&eacute;via de no m&iacute;nimo 30 dias.
              </li>
              <li>
                <strong>Inadimpl&ecirc;ncia:</strong> Em caso de n&atilde;o pagamento, o acesso &agrave;
                Plataforma poder&aacute; ser suspenso ap&oacute;s 10 dias de atraso, com pr&eacute;via
                notifica&ccedil;&atilde;o. Os dados ser&atilde;o mantidos por 90 dias ap&oacute;s a suspens&atilde;o,
                per&iacute;odo no qual a Cl&iacute;nica poder&aacute; regularizar a situa&ccedil;&atilde;o.
              </li>
              <li>
                <strong>Cancelamento:</strong> A Cl&iacute;nica poder&aacute; cancelar a assinatura a qualquer
                momento. O acesso permanecer&aacute; ativo at&eacute; o fim do per&iacute;odo j&aacute; pago. N&atilde;o
                haver&aacute; reembolso proporcional, salvo disposi&ccedil;&atilde;o em contr&aacute;rio prevista em lei.
              </li>
            </ul>
          </section>

          {/* 9. Vigencia e Rescisao */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              9. Vig&ecirc;ncia e Rescis&atilde;o
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Estes Termos de Uso entram em vigor na data de aceite pelo Usu&aacute;rio e permanecem
              v&aacute;lidos enquanto a conta estiver ativa na Plataforma.
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Rescis&atilde;o pela Cl&iacute;nica:</strong> A Cl&iacute;nica pode rescindir a qualquer
                momento, cancelando a assinatura pelo painel administrativo da Plataforma.
              </li>
              <li>
                <strong>Rescis&atilde;o pela Plataforma:</strong> A Plataforma pode rescindir estes
                Termos em caso de viola&ccedil;&atilde;o das obriga&ccedil;&otilde;es previstas, uso indevido,
                fraude ou inadimpl&ecirc;ncia prolongada, mediante notifica&ccedil;&atilde;o pr&eacute;via de 15 dias.
              </li>
              <li>
                <strong>Exporta&ccedil;&atilde;o de dados:</strong> Ap&oacute;s a rescis&atilde;o ou cancelamento,
                a Cl&iacute;nica ter&aacute; um prazo de 30 dias para exportar seus dados atrav&eacute;s das
                funcionalidades de exporta&ccedil;&atilde;o da Plataforma. Ap&oacute;s esse prazo, os dados
                ser&atilde;o eliminados, exceto quando houver obriga&ccedil;&atilde;o legal de reten&ccedil;&atilde;o.
              </li>
              <li>
                <strong>Sobreviv&ecirc;ncia:</strong> As cl&aacute;usulas relativas a propriedade intelectual,
                limita&ccedil;&atilde;o de responsabilidade e disposi&ccedil;&otilde;es gerais sobreviver&atilde;o &agrave;
                rescis&atilde;o destes Termos.
              </li>
            </ul>
          </section>

          {/* 10. Limitacao de Responsabilidade */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              10. Limita&ccedil;&atilde;o de Responsabilidade
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Na m&aacute;xima extens&atilde;o permitida pela legisla&ccedil;&atilde;o aplic&aacute;vel:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                A responsabilidade total da Plataforma por danos diretos ser&aacute; limitada ao
                valor total pago pela Cl&iacute;nica nos 12 meses anteriores ao evento que deu
                origem &agrave; reclama&ccedil;&atilde;o.
              </li>
              <li>
                A Plataforma n&atilde;o ser&aacute; respons&aacute;vel por danos indiretos, incidentais,
                especiais, consequenciais ou punitivos, incluindo lucros cessantes, perda
                de dados ou interrup&ccedil;&atilde;o de neg&oacute;cios.
              </li>
              <li>
                As funcionalidades de intelig&ecirc;ncia artificial t&ecirc;m car&aacute;ter auxiliar e
                informativo. A Plataforma n&atilde;o se responsabiliza por decis&otilde;es cl&iacute;nicas
                ou administrativas baseadas em conte&uacute;dos gerados por IA.
              </li>
              <li>
                A Plataforma n&atilde;o garante que o servi&ccedil;o ser&aacute; ininterrupto ou livre de
                erros, embora se empenhe para manter alta disponibilidade e qualidade.
              </li>
            </ul>
          </section>

          {/* 11. Disposicoes Gerais */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              11. Disposi&ccedil;&otilde;es Gerais
            </h2>
            <div className="space-y-3">
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Notifica&ccedil;&otilde;es</p>
                <p className="text-sm text-gray-600 mt-1">
                  Todas as comunica&ccedil;&otilde;es e notifica&ccedil;&otilde;es relativas a estes Termos ser&atilde;o
                  realizadas por meio da Plataforma ou por e-mail cadastrado pelo Usu&aacute;rio.
                  O Usu&aacute;rio &eacute; respons&aacute;vel por manter seu e-mail atualizado.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Cess&atilde;o</p>
                <p className="text-sm text-gray-600 mt-1">
                  O Usu&aacute;rio n&atilde;o poder&aacute; ceder ou transferir seus direitos e obriga&ccedil;&otilde;es
                  decorrentes destes Termos sem o consentimento pr&eacute;vio e por escrito da
                  Plataforma. A Plataforma poder&aacute; ceder seus direitos e obriga&ccedil;&otilde;es a
                  terceiros mediante notifica&ccedil;&atilde;o ao Usu&aacute;rio.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Independ&ecirc;ncia das Cl&aacute;usulas</p>
                <p className="text-sm text-gray-600 mt-1">
                  Caso qualquer disposi&ccedil;&atilde;o destes Termos seja considerada inv&aacute;lida ou
                  inexequ&iacute;vel, as demais disposi&ccedil;&otilde;es permanecer&atilde;o em pleno vigor e efeito.
                  A disposi&ccedil;&atilde;o inv&aacute;lida ser&aacute; substitu&iacute;da por outra que melhor reflita a
                  inten&ccedil;&atilde;o original das partes.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Altera&ccedil;&otilde;es nos Termos</p>
                <p className="text-sm text-gray-600 mt-1">
                  A Plataforma reserva-se o direito de alterar estes Termos a qualquer momento.
                  Altera&ccedil;&otilde;es significativas ser&atilde;o comunicadas com anteced&ecirc;ncia m&iacute;nima de
                  30 dias. O uso continuado da Plataforma ap&oacute;s as altera&ccedil;&otilde;es constitui
                  aceita&ccedil;&atilde;o dos novos Termos.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Totalidade do Acordo</p>
                <p className="text-sm text-gray-600 mt-1">
                  Estes Termos de Uso, juntamente com a{' '}
                  <Link to="/privacidade" className="text-primary hover:underline">
                    Pol&iacute;tica de Privacidade
                  </Link>
                  , constituem o acordo integral entre as partes no que diz respeito
                  ao uso da Plataforma, substituindo quaisquer entendimentos ou acordos
                  anteriores.
                </p>
              </div>
            </div>
          </section>

          {/* 12. Foro */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              12. Foro
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              As partes elegem o foro da Comarca de S&atilde;o Paulo, Estado de S&atilde;o Paulo, como
              competente para dirimir quaisquer quest&otilde;es decorrentes destes Termos de Uso,
              com ren&uacute;ncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          {/* Footer */}
          <footer className="border-t border-gray-200 pt-6 mt-10 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                <strong>&Uacute;ltima atualiza&ccedil;&atilde;o:</strong> 23 de fevereiro de 2026
              </p>
              <Link
                to="/privacidade"
                className="text-sm text-primary hover:underline"
              >
                Pol&iacute;tica de Privacidade
              </Link>
            </div>
            <div className="flex justify-center">
              <Link
                to="/"
                className="text-sm text-primary hover:underline"
              >
                &larr; Voltar ao aplicativo
              </Link>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
