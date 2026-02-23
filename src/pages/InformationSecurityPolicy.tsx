import { Link } from 'react-router-dom';
import { LegalPageLayout } from '@/components/layout/LegalPageLayout';

const InformationSecurityPolicy = () => {
  return (
    <LegalPageLayout>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 space-y-10 text-justify">
          {/* Title */}
          <div className="text-center border-b border-gray-200 pb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Pol&iacute;tica de Seguran&ccedil;a da Informa&ccedil;&atilde;o
            </h1>
            <p className="text-gray-500 text-sm">
              Em conformidade com a LGPD, normas do CFO e boas pr&aacute;ticas de seguran&ccedil;a (ISO 27001)
            </p>
          </div>

          {/* Resumo */}
          <section className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-2">
            <h2 className="text-base font-semibold text-gray-900">Em poucas palavras</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Esta pol&iacute;tica descreve como o <strong>Organiza Odonto</strong> protege as informa&ccedil;&otilde;es
              sob sua responsabilidade. Utilizamos criptografia em m&uacute;ltiplas camadas, controle de
              acesso rigoroso, monitoramento cont&iacute;nuo e pr&aacute;ticas de desenvolvimento seguro para
              garantir a confidencialidade, integridade e disponibilidade dos dados.
            </p>
          </section>

          {/* 1. Objetivo e Escopo */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              1. Objetivo e Escopo
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Esta Pol&iacute;tica de Seguran&ccedil;a da Informa&ccedil;&atilde;o tem como objetivo estabelecer diretrizes,
              responsabilidades e procedimentos para a prote&ccedil;&atilde;o das informa&ccedil;&otilde;es tratadas pela
              plataforma Organiza Odonto, assegurando:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li><strong>Confidencialidade:</strong> Acesso restrito apenas a pessoas autorizadas.</li>
              <li><strong>Integridade:</strong> Prote&ccedil;&atilde;o contra altera&ccedil;&otilde;es n&atilde;o autorizadas.</li>
              <li><strong>Disponibilidade:</strong> Garantia de acesso quando necess&aacute;rio.</li>
            </ul>
            <p className="text-gray-600 text-sm leading-relaxed">
              Esta pol&iacute;tica aplica-se a todos os dados pessoais e sens&iacute;veis de pacientes,
              dados de profissionais, dados financeiros e demais informa&ccedil;&otilde;es processadas pela
              plataforma, abrangendo colaboradores, suboperadores e todos os sistemas envolvidos.
            </p>
            <div className="border-l-4 border-blue-400 pl-4 bg-blue-50/50 p-3 rounded-r-md">
              <p className="text-sm text-gray-700 leading-relaxed">
                Esta pol&iacute;tica complementa a{' '}
                <Link to="/privacidade" className="text-primary hover:underline font-medium">Pol&iacute;tica de Privacidade</Link>,
                os <Link to="/termos" className="text-primary hover:underline font-medium">Termos de Uso</Link> e
                o <Link to="/dpa" className="text-primary hover:underline font-medium">Acordo de Processamento de Dados (DPA)</Link>,
                que juntos formam o arcabou&ccedil;o de governan&ccedil;a de dados da plataforma.
              </p>
            </div>
          </section>

          {/* 2. Classificacao da Informacao */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              2. Classifica&ccedil;&atilde;o da Informa&ccedil;&atilde;o
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              As informa&ccedil;&otilde;es tratadas pela plataforma s&atilde;o classificadas nos seguintes n&iacute;veis:
            </p>
            <div className="space-y-3">
              <div className="border-l-4 border-green-400 pl-4 bg-green-50/50 p-3 rounded-r-md">
                <p className="text-sm font-medium text-gray-800">P&uacute;blica</p>
                <p className="text-sm text-gray-600">
                  Informa&ccedil;&otilde;es de acesso livre, como p&aacute;ginas institucionais, pol&iacute;ticas publicadas
                  e materiais de divulga&ccedil;&atilde;o. N&atilde;o requerem prote&ccedil;&atilde;o especial contra divulga&ccedil;&atilde;o.
                </p>
              </div>
              <div className="border-l-4 border-blue-400 pl-4 bg-blue-50/50 p-3 rounded-r-md">
                <p className="text-sm font-medium text-gray-800">Interna</p>
                <p className="text-sm text-gray-600">
                  Informa&ccedil;&otilde;es operacionais de uso interno, como configura&ccedil;&otilde;es da cl&iacute;nica,
                  agenda de consultas e dados de uso da plataforma. Acesso restrito a usu&aacute;rios autenticados.
                </p>
              </div>
              <div className="border-l-4 border-amber-400 pl-4 bg-amber-50/50 p-3 rounded-r-md">
                <p className="text-sm font-medium text-gray-800">Confidencial</p>
                <p className="text-sm text-gray-600">
                  Dados pessoais de pacientes (nome, CPF, contato), dados financeiros e registros
                  profissionais. Requerem criptografia, controle de acesso RBAC e logs de auditoria.
                </p>
              </div>
              <div className="border-l-4 border-red-400 pl-4 bg-red-50/50 p-3 rounded-r-md">
                <p className="text-sm font-medium text-gray-800">Restrita</p>
                <p className="text-sm text-gray-600">
                  Dados sens&iacute;veis de sa&uacute;de (anamnese, prontu&aacute;rios, planos de tratamento, radiografias),
                  chaves de criptografia e credenciais de acesso. Requerem criptografia adicional (pgcrypto),
                  acesso m&iacute;nimo necess&aacute;rio e rastreamento completo de acesso.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Controle de Acesso */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              3. Controle de Acesso
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma implementa controle de acesso em m&uacute;ltiplas camadas para garantir que
              apenas usu&aacute;rios autorizados acessem os dados necess&aacute;rios ao exerc&iacute;cio de suas fun&ccedil;&otilde;es:
            </p>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">RBAC &mdash; Controle de Acesso Baseado em Fun&ccedil;&otilde;es</p>
                <p className="text-sm text-gray-600 mt-1">
                  Tr&ecirc;s perfis de acesso: <strong>Administrador</strong> (acesso total),
                  <strong> Dentista</strong> (prontu&aacute;rios e agenda) e <strong>Secret&aacute;ria</strong> (agendamento
                  e cadastro). Cada perfil acessa apenas as funcionalidades necess&aacute;rias.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">RLS &mdash; Row Level Security</p>
                <p className="text-sm text-gray-600 mt-1">
                  Pol&iacute;ticas de seguran&ccedil;a em n&iacute;vel de linha no banco de dados Postgres. Cada cl&iacute;nica
                  acessa exclusivamente seus pr&oacute;prios dados, com isolamento completo entre inquilinos.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Autentica&ccedil;&atilde;o e Sess&otilde;es</p>
                <p className="text-sm text-gray-600 mt-1">
                  Autentica&ccedil;&atilde;o via JWT com tokens de curta dura&ccedil;&atilde;o. Pol&iacute;tica de senhas fortes
                  com m&iacute;nimo de 12 caracteres. Gerenciamento de sess&otilde;es ativas com possibilidade
                  de revoga&ccedil;&atilde;o remota.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Princ&iacute;pio do Menor Privil&eacute;gio</p>
                <p className="text-sm text-gray-600 mt-1">
                  Usu&aacute;rios e servi&ccedil;os recebem apenas as permiss&otilde;es m&iacute;nimas necess&aacute;rias.
                  Chaves de criptografia s&atilde;o inacess&iacute;veis via API (REVOKE + RLS).
                  Service role key &eacute; restrita a Edge Functions no servidor.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Acesso Administrativo ao Ambiente de Produ&ccedil;&atilde;o</p>
                <p className="text-sm text-gray-600 mt-1">
                  O acesso administrativo ao ambiente de produ&ccedil;&atilde;o &eacute; restrito a pessoal
                  autorizado, protegido por senha forte (m&iacute;nimo 12 caracteres) e registrado
                  em logs espec&iacute;ficos de acesso privilegiado.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Gest&atilde;o de Desligamento</p>
                <p className="text-sm text-gray-600 mt-1">
                  A responsabilidade pela revoga&ccedil;&atilde;o imediata do acesso de profissionais
                  desligados da cl&iacute;nica recai sobre o Administrador da conta na plataforma.
                  O sistema disponibiliza logs de auditoria para confer&ecirc;ncia de acessos
                  p&oacute;s-desligamento.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Criptografia */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              4. Criptografia
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma utiliza criptografia em m&uacute;ltiplas camadas para prote&ccedil;&atilde;o dos dados:
            </p>
            <div className="space-y-3">
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Dados em Tr&acirc;nsito</p>
                <p className="text-sm text-gray-600">
                  Todas as comunica&ccedil;&otilde;es entre cliente e servidor s&atilde;o protegidas por TLS 1.2 ou
                  superior, incluindo chamadas &agrave; API, webhooks e comunica&ccedil;&atilde;o com suboperadores.
                  Headers HSTS garantem que o navegador sempre utilize HTTPS.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Dados em Repouso</p>
                <p className="text-sm text-gray-600">
                  O banco de dados utiliza criptografia transparente de disco (AES-256).
                  Backups s&atilde;o armazenados com criptografia, garantindo prote&ccedil;&atilde;o mesmo em caso de
                  acesso f&iacute;sico ao m&iacute;dia de armazenamento.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Criptografia em N&iacute;vel de Campo (pgcrypto)</p>
                <p className="text-sm text-gray-600">
                  Dados especialmente sens&iacute;veis (CPF, RG) recebem camada adicional de criptografia
                  em n&iacute;vel de aplica&ccedil;&atilde;o utilizando pgcrypto, com chave armazenada em tabela protegida
                  por RLS e REVOKE, inacess&iacute;vel via API p&uacute;blica. Mesmo em caso de acesso indevido
                  ao banco de dados, esses campos permanecem ileg&iacute;veis sem a chave de descriptografia,
                  que &eacute; acess&iacute;vel exclusivamente pelas Edge Functions no servidor.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Gestao de Incidentes */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              5. Gest&atilde;o de Incidentes de Seguran&ccedil;a
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma mant&eacute;m procedimentos formais para identifica&ccedil;&atilde;o, resposta e
              recupera&ccedil;&atilde;o de incidentes de seguran&ccedil;a:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Detec&ccedil;&atilde;o:</strong> Monitoramento cont&iacute;nuo via logs de auditoria, alertas
                de rate limiting e an&aacute;lise de padr&otilde;es an&ocirc;malos de acesso.
              </li>
              <li>
                <strong>Classifica&ccedil;&atilde;o:</strong> Avalia&ccedil;&atilde;o da gravidade com base no tipo de dados
                afetados, n&uacute;mero de titulares e natureza do incidente.
              </li>
              <li>
                <strong>Conten&ccedil;&atilde;o:</strong> Isolamento imediato dos sistemas afetados, revoga&ccedil;&atilde;o de
                credenciais comprometidas e bloqueio de acessos suspeitos.
              </li>
              <li>
                <strong>Notifica&ccedil;&atilde;o:</strong> Comunica&ccedil;&atilde;o ao controlador (cl&iacute;nica) em at&eacute; 48 horas
                ap&oacute;s a confirma&ccedil;&atilde;o razo&aacute;vel do incidente, conforme previsto no Acordo de
                Processamento de Dados (DPA), e, quando aplic&aacute;vel, &agrave; ANPD conforme Art. 48 da LGPD.
              </li>
              <li>
                <strong>Recupera&ccedil;&atilde;o:</strong> Restaura&ccedil;&atilde;o dos sistemas a um estado seguro,
                implementa&ccedil;&atilde;o de corre&ccedil;&otilde;es e documenta&ccedil;&atilde;o detalhada do incidente.
              </li>
              <li>
                <strong>Li&ccedil;&otilde;es aprendidas:</strong> Revis&atilde;o p&oacute;s-incidente para identificar
                melhorias e prevenir recorr&ecirc;ncia.
              </li>
            </ul>
          </section>

          {/* 6. Backup e Recuperacao */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              6. Backup e Recupera&ccedil;&atilde;o de Desastres
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para garantir a disponibilidade dos dados, especialmente prontu&aacute;rios odontol&oacute;gicos
              cuja perda pode acarretar consequ&ecirc;ncias legais:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Backups automatizados di&aacute;rios</strong> com reten&ccedil;&atilde;o m&iacute;nima de 30 dias,
                armazenados com criptografia em localiza&ccedil;&atilde;o geograficamente distinta.
              </li>
              <li>
                <strong>Point-in-time recovery (PITR)</strong> permitindo restaura&ccedil;&atilde;o do banco de dados
                a qualquer ponto no tempo dentro da janela de reten&ccedil;&atilde;o.
              </li>
              <li>
                <strong>Redund&acirc;ncia geogr&aacute;fica</strong> do provedor de infraestrutura para prote&ccedil;&atilde;o
                contra falhas de data center.
              </li>
              <li>
                <strong>Testes de restaura&ccedil;&atilde;o:</strong> Realizados no m&iacute;nimo trimestralmente,
                com documenta&ccedil;&atilde;o dos resultados para valida&ccedil;&atilde;o da integridade dos backups.
              </li>
              <li>
                <strong>RTO (Recovery Time Objective):</strong> Objetivo de recupera&ccedil;&atilde;o em at&eacute; 4 horas
                para incidentes cr&iacute;ticos.
              </li>
              <li>
                <strong>RPO (Recovery Point Objective):</strong> Minimizado pelo PITR cont&iacute;nuo,
                com perda m&aacute;xima de minutos em opera&ccedil;&atilde;o normal. Em cen&aacute;rio catastr&oacute;fico
                (perda completa do data center): at&eacute; 24 horas.
              </li>
              <li>
                <strong>Continuidade de neg&oacute;cios:</strong> A plataforma mant&eacute;m plano de continuidade
                documentado, contemplando cen&aacute;rios de indisponibilidade de infraestrutura,
                comprometimento de credenciais e falhas sist&ecirc;micas.
              </li>
              <li>
                <strong>Janela de manuten&ccedil;&atilde;o:</strong> Manuten&ccedil;&otilde;es preventivas que possam causar
                indisponibilidade tempor&aacute;ria ser&atilde;o realizadas preferencialmente em hor&aacute;rios de
                baixo uso (madrugadas e finais de semana) e comunicadas com anteced&ecirc;ncia
                m&iacute;nima de 24 horas.
              </li>
            </ul>
          </section>

          {/* 7. Desenvolvimento Seguro */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              7. Desenvolvimento Seguro
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O ciclo de desenvolvimento da plataforma incorpora pr&aacute;ticas de seguran&ccedil;a em todas as etapas:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  title: 'Code Review',
                  desc: 'Toda altera\u00e7\u00e3o de c\u00f3digo passa por revis\u00e3o obrigat\u00f3ria antes de ser integrada ao sistema.'
                },
                {
                  title: 'Gest\u00e3o de Depend\u00eancias',
                  desc: 'Monitoramento cont\u00ednuo de vulnerabilidades em depend\u00eancias e atualiza\u00e7\u00f5es de seguran\u00e7a.'
                },
                {
                  title: 'Valida\u00e7\u00e3o de Entrada',
                  desc: 'Todas as APIs validam e sanitizam dados de entrada para prevenir inje\u00e7\u00e3o e XSS.'
                },
                {
                  title: 'Princ\u00edpio OWASP Top 10',
                  desc: 'Prote\u00e7\u00e3o contra as 10 principais vulnerabilidades web: inje\u00e7\u00e3o, XSS, CSRF, etc.'
                },
                {
                  title: 'Separa\u00e7\u00e3o de Ambientes',
                  desc: 'Ambientes de desenvolvimento, homologa\u00e7\u00e3o e produ\u00e7\u00e3o isolados.'
                },
                {
                  title: 'Gest\u00e3o de Segredos',
                  desc: 'Chaves de API e credenciais armazenadas em vari\u00e1veis de ambiente seguras, nunca no c\u00f3digo-fonte.'
                },
                {
                  title: 'Gest\u00e3o de Vulnerabilidades',
                  desc: 'Varreduras automatizadas de vulnerabilidades em depend\u00eancias, monitoramento de CVEs e aplica\u00e7\u00e3o de patches cr\u00edticos em at\u00e9 24h (cr\u00edticos), 7 dias (altos) ou 30 dias (m\u00e9dios).'
                },
              ].map((item) => (
                <div key={item.title} className="border border-gray-200 rounded-md p-3">
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 8. Treinamento */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              8. Treinamento e Conscientiza&ccedil;&atilde;o
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A seguran&ccedil;a da informa&ccedil;&atilde;o depende do comprometimento de todas as partes envolvidas:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Equipe interna:</strong> Treinamento obrigat&oacute;rio anual sobre prote&ccedil;&atilde;o de dados, sigilo
                profissional, reconhecimento de amea&ccedil;as (phishing, engenharia social) e procedimentos de resposta,
                com sess&otilde;es adicionais em caso de incidentes ou mudan&ccedil;as significativas na pol&iacute;tica.
              </li>
              <li>
                <strong>Cl&iacute;nicas (Controladores):</strong> Orienta&ccedil;&otilde;es sobre boas pr&aacute;ticas de seguran&ccedil;a,
                como uso de senhas fortes, gerenciamento de sess&otilde;es e cuidados ao compartilhar credenciais.
              </li>
              <li>
                <strong>Onboarding de seguran&ccedil;a:</strong> Todo novo colaborador recebe treinamento sobre
                esta pol&iacute;tica e assina termo de confidencialidade antes de acessar sistemas.
              </li>
              <li>
                <strong>Atualiza&ccedil;&atilde;o peri&oacute;dica:</strong> Revis&atilde;o e atualiza&ccedil;&atilde;o dos treinamentos
                em resposta a novas amea&ccedil;as e mudan&ccedil;as regulat&oacute;rias.
              </li>
            </ul>
          </section>

          {/* 9. Monitoramento e Auditoria */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              9. Monitoramento e Auditoria
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma mant&eacute;m monitoramento cont&iacute;nuo para detec&ccedil;&atilde;o de atividades suspeitas
              e garantia de conformidade:
            </p>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Logs de Auditoria Imut&aacute;veis</p>
                <p className="text-sm text-gray-600 mt-1">
                  Todos os acessos e altera&ccedil;&otilde;es de dados s&atilde;o registrados com timestamp, usu&aacute;rio,
                  IP de origem e a&ccedil;&atilde;o realizada. Os logs s&atilde;o imut&aacute;veis (apenas inser&ccedil;&atilde;o, sem
                  atualiza&ccedil;&atilde;o ou exclus&atilde;o) e protegidos por pol&iacute;ticas de banco de dados.
                  Reten&ccedil;&atilde;o m&iacute;nima de 2 anos, salvo necessidade de manuten&ccedil;&atilde;o para defesa em
                  processo judicial ou administrativo.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Rastreamento de IP</p>
                <p className="text-sm text-gray-600 mt-1">
                  Registro do endere&ccedil;o IP em opera&ccedil;&otilde;es cr&iacute;ticas (login, aceite de termos,
                  consentimento de IA) para fins de auditoria e conformidade legal.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Dashboard de Seguran&ccedil;a</p>
                <p className="text-sm text-gray-600 mt-1">
                  Painel administrativo com m&eacute;tricas em tempo real: eventos de seguran&ccedil;a, distribui&ccedil;&atilde;o
                  por fun&ccedil;&atilde;o, tipos de a&ccedil;&otilde;es e alertas de anomalias.
                </p>
              </div>
              <div className="bg-gray-50 rounded-md p-4">
                <p className="text-sm font-medium text-gray-800">Rate Limiting</p>
                <p className="text-sm text-gray-600 mt-1">
                  Limita&ccedil;&atilde;o de taxa em todas as APIs para prote&ccedil;&atilde;o contra ataques de for&ccedil;a bruta
                  e abuso, com fallback em mem&oacute;ria quando o armazenamento prim&aacute;rio n&atilde;o est&aacute; dispon&iacute;vel.
                </p>
              </div>
            </div>
          </section>

          {/* 10. Gestao de Terceiros */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              10. Gest&atilde;o de Terceiros e Suboperadores
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Todos os suboperadores s&atilde;o selecionados com base em crit&eacute;rios rigorosos de seguran&ccedil;a:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Due diligence de seguran&ccedil;a:</strong> Avalia&ccedil;&atilde;o de certifica&ccedil;&otilde;es, pol&iacute;ticas
                de seguran&ccedil;a e conformidade regulat&oacute;ria antes da contrata&ccedil;&atilde;o.
              </li>
              <li>
                <strong>Contratos com cl&aacute;usulas de prote&ccedil;&atilde;o de dados:</strong> Obriga&ccedil;&otilde;es de
                confidencialidade, limita&ccedil;&atilde;o de finalidade e medidas de seguran&ccedil;a equivalentes.
              </li>
              <li>
                <strong>Monitoramento cont&iacute;nuo:</strong> Avalia&ccedil;&atilde;o peri&oacute;dica da conformidade dos
                suboperadores com as obriga&ccedil;&otilde;es contratuais.
              </li>
              <li>
                <strong>Pseudonimiza&ccedil;&atilde;o para IA:</strong> Dados enviados a provedores de intelig&ecirc;ncia
                artificial passam por processo de pseudonimiza&ccedil;&atilde;o e <em>masking</em>, removendo
                identificadores diretos (nomes, CPFs, endere&ccedil;os) antes do processamento.
              </li>
              <li>
                <strong>N&atilde;o treinamento:</strong> Compromisso contratual de que os provedores de IA
                n&atilde;o utilizar&atilde;o dados enviados via API para treinamento de seus modelos.
              </li>
            </ul>
          </section>

          {/* 11. Conformidade Regulatoria */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              11. Conformidade Regulat&oacute;ria
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma opera em conformidade com as seguintes regulamenta&ccedil;&otilde;es:
            </p>
            <div className="space-y-3">
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">LGPD &mdash; Lei Geral de Prote&ccedil;&atilde;o de Dados (Lei 13.709/2018)</p>
                <p className="text-sm text-gray-600">
                  Bases legais documentadas, consentimento para IA, direitos dos titulares,
                  reten&ccedil;&atilde;o com prazos definidos, DPA com controladores e notifica&ccedil;&atilde;o de incidentes.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">CFO &mdash; Conselho Federal de Odontologia</p>
                <p className="text-sm text-gray-600">
                  Reten&ccedil;&atilde;o de prontu&aacute;rios por m&iacute;nimo de 20 anos, registro de procedimentos e
                  conformidade com normas t&eacute;cnicas de documenta&ccedil;&atilde;o odontol&oacute;gica.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">ANVISA &mdash; Ag&ecirc;ncia Nacional de Vigil&acirc;ncia Sanit&aacute;ria</p>
                <p className="text-sm text-gray-600">
                  Conformidade com requisitos de rastreabilidade e documenta&ccedil;&atilde;o para
                  materiais e insumos odontol&oacute;gicos gerenciados pela plataforma.
                </p>
              </div>
              <div className="border-l-4 border-primary/60 pl-4">
                <p className="text-sm font-medium text-gray-800">Legisla&ccedil;&atilde;o Tribut&aacute;ria</p>
                <p className="text-sm text-gray-600">
                  Reten&ccedil;&atilde;o de dados financeiros e fiscais por 5 anos, conforme obriga&ccedil;&otilde;es
                  legais aplic&aacute;veis &agrave;s cl&iacute;nicas.
                </p>
              </div>
            </div>
          </section>

          {/* 12. Descarte Seguro */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              12. Descarte Seguro de Dados
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              O ciclo de vida dos dados inclui procedimentos formais de descarte para garantir
              que informa&ccedil;&otilde;es expiradas sejam eliminadas de forma segura e irrevers&iacute;vel:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Exclus&atilde;o l&oacute;gica seguida de purge:</strong> Dados marcados para exclus&atilde;o
                s&atilde;o primeiro removidos logicamente (soft delete) e, ap&oacute;s o per&iacute;odo de reten&ccedil;&atilde;o
                aplic&aacute;vel, eliminados definitivamente do banco de dados.
              </li>
              <li>
                <strong>Rotinas autom&aacute;ticas:</strong> O sistema executa rotinas de limpeza peri&oacute;dicas
                (pg_cron) para eliminar dados expirados: logs de auditoria ap&oacute;s 2 anos, dados
                fiscais ap&oacute;s 5 anos e dados tempor&aacute;rios de IA ap&oacute;s 24 horas.
              </li>
              <li>
                <strong>Backups:</strong> Os dados eliminados s&atilde;o removidos dos backups conforme a
                janela de reten&ccedil;&atilde;o de 30 dias. Ap&oacute;s esse per&iacute;odo, n&atilde;o h&aacute; c&oacute;pia remanescente.
              </li>
              <li>
                <strong>Sem m&iacute;dias f&iacute;sicas:</strong> A plataforma opera integralmente em nuvem.
                N&atilde;o h&aacute; armazenamento em m&iacute;dias f&iacute;sicas locais, eliminando a necessidade
                de destrui&ccedil;&atilde;o f&iacute;sica de m&iacute;dia.
              </li>
            </ul>
          </section>

          {/* 13. Seguranca Fisica */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              13. Seguran&ccedil;a F&iacute;sica
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              A plataforma Organiza Odonto opera integralmente em infraestrutura de nuvem,
              sem servidores pr&oacute;prios ou armazenamento local de dados. A seguran&ccedil;a f&iacute;sica
              dos data centers &eacute; de responsabilidade do provedor de infraestrutura, que mant&eacute;m:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>Certifica&ccedil;&atilde;o SOC 2 Type II</li>
              <li>Controle de acesso f&iacute;sico com biometria e vigil&acirc;ncia 24/7</li>
              <li>Prote&ccedil;&atilde;o contra inc&ecirc;ndio, inunda&ccedil;&atilde;o e falhas de energia</li>
              <li>Redund&acirc;ncia geogr&aacute;fica e sistemas de energia ininterrupta (UPS)</li>
            </ul>
          </section>

          {/* 14. Revisao e Atualizacao */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">
              14. Revis&atilde;o e Atualiza&ccedil;&atilde;o da Pol&iacute;tica
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Esta pol&iacute;tica ser&aacute; revisada e atualizada periodicamente para garantir sua efic&aacute;cia
              e adequa&ccedil;&atilde;o:
            </p>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Revis&atilde;o anual obrigat&oacute;ria:</strong> Avalia&ccedil;&atilde;o completa da pol&iacute;tica,
                incluindo efic&aacute;cia das medidas implementadas e adequa&ccedil;&atilde;o a novas amea&ccedil;as.
              </li>
              <li>
                <strong>Revis&atilde;o extraordin&aacute;ria:</strong> Sempre que houver incidente de seguran&ccedil;a
                relevante, altera&ccedil;&atilde;o legislativa ou mudan&ccedil;a significativa na infraestrutura.
              </li>
              <li>
                <strong>Comunica&ccedil;&atilde;o de mudan&ccedil;as:</strong> Altera&ccedil;&otilde;es relevantes ser&atilde;o comunicadas
                aos controladores (cl&iacute;nicas) com anteced&ecirc;ncia m&iacute;nima de 30 dias.
              </li>
              <li>
                <strong>Versionamento:</strong> Todas as vers&otilde;es anteriores desta pol&iacute;tica s&atilde;o
                mantidas em arquivo para fins de auditoria e conformidade.
              </li>
            </ul>
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
                  to="/dpa"
                  className="text-sm text-primary hover:underline"
                >
                  DPA
                </Link>
              </div>
            </div>
          </footer>
        </div>
    </LegalPageLayout>
  );
};

export default InformationSecurityPolicy;
