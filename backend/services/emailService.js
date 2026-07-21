const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const style = `
  body {
    font-family: Arial, Helvetica, sans-serif;
    background-color: #ffffff;
    color: #333333;
    margin: 0;
    padding: 40px 20px;
    display: flex;
    justify-content: center;
  }
  .card {
    border: 1px solid #dcdfe3;
    border-radius: 8px;
    padding: 30px 40px;
    max-width: 650px;
    width: 100%;
    box-sizing: border-box;
  }
  h1 {
    color: #12519e;
    font-size: 24px;
    margin-top: 0;
    margin-bottom: 25px;
  }
  p {
    font-size: 16px;
    line-height: 1.5;
    color: #4a4a4a;
    margin-bottom: 15px;
  }
  .details-box {
    background-color: #f8f9fb;
    border-radius: 6px;
    padding: 20px 20px 20px 40px;
    margin: 25px 0;
  }
  .details-box ul {
    list-style-type: disc;
    margin: 0;
    padding: 0;
    color: #333333;
  }
  .details-box li {
    margin-bottom: 6px;
    font-size: 16px;
    line-height: 1.6;
  }
  .details-box li:last-child {
    margin-bottom: 0;
  }
  .btn-container {
    text-align: center;
    margin: 40px 0;
  }
  .btn {
    background-color: #12519e;
    color: #ffffff;
    text-decoration: none;
    padding: 14px 28px;
    border-radius: 6px;
    font-weight: bold;
    font-size: 16px;
    display: inline-block;
  }
  .btn:hover {
    background-color: #0d3f7d;
  }
  .warning {
    color: #be5c00;
    font-weight: bold;
    font-size: 16px;
    line-height: 1.5;
    margin-bottom: 25px;
  }
  hr {
    border: 0;
    border-top: 1px solid #e5e7eb;
    margin: 25px 0;
  }
  .footer {
    color: #6b7280;
    font-size: 14px;
  }
`;

function confirmacaoHtml(data) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de Solicitação - Ticket: ${data.ticket}</title>
  <style>${style}</style>
</head>
<body>
  <div class="card">
    <h1>Solicitação Recebida com Sucesso!</h1>
    <p>Olá, <strong>${data.solicitante}</strong>.</p>
    <p>Recebemos a sua solicitação de reserva de espaço. Abaixo estão os detalhes do seu pedido:</p>
    <div class="details-box">
      <ul>
        <li><strong>Ticket:</strong> ${data.ticket}</li>
        <li><strong>Local:</strong> ${data.auditorio}</li>
        <li><strong>Atividade:</strong> ${data.atividade}</li>
        <li><strong>Início:</strong> ${data.data_inicio}</li>
      </ul>
    </div>
    <div class="btn-container">
      <a href="https://reservas.cchla.ufrn.br/acompanhamento?ticket=${data.ticket}" class="btn">Acompanhar Solicitação em Tempo Real</a>
    </div>
    <div class="warning">⚠️ Atenção: Este e-mail é apenas uma confirmação de recebimento. Sua reserva está PENDENTE de análise pela secretaria.</div>
    <hr>
    <div class="footer">Secretaria do Centro de Ciências Humanas, Letras e Artes (CCHLA) — UFRN</div>
  </div>
</body>
</html>`;
}

function statusHtml(data) {
  const isApproved = data.status === 'Aprovado';
  const isRejected = data.status === 'Reprovado';

  const h1Color = isApproved ? '#16a34a' : isRejected ? '#dc2626' : '#12519e';
  const h1Text = isApproved ? 'Solicitação Aprovada! \uD83C\uDF89'
    : isRejected ? 'Solicitação Reprovada'
    : 'Status Atualizado';

  const warningText = isApproved
    ? '\u2705 Sua solicitação foi aprovada pela secretaria.'
    : isRejected
      ? `\u274C Sua solicitação foi reprovada${data.motivo ? `. Motivo: ${data.motivo}` : ''}.`
      : '\u23F3 Sua solicitação continua pendente de análise pela secretaria.';

  const motivoItem = data.motivo
    ? `<li><strong>Motivo:</strong> ${data.motivo}</li>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Status da Solicitação - Ticket: ${data.ticket}</title>
  <style>${style}</style>
</head>
<body>
  <div class="card">
    <h1 style="color:${h1Color}">${h1Text}</h1>
    <p>Olá, <strong>${data.solicitante}</strong>.</p>
    <p>Confira os detalhes da sua solicitação:</p>
    <div class="details-box">
      <ul>
        <li><strong>Ticket:</strong> ${data.ticket}</li>
        <li><strong>Local:</strong> ${data.auditorio}</li>
        <li><strong>Atividade:</strong> ${data.atividade}</li>
        <li><strong>Início:</strong> ${data.data_inicio}</li>
        ${motivoItem}
      </ul>
    </div>
    <div class="btn-container">
      <a href="https://reservas.cchla.ufrn.br/acompanhamento?ticket=${data.ticket}" class="btn">Acompanhar Solicitação em Tempo Real</a>
    </div>
    <div class="warning">${warningText}</div>
    <hr>
    <div class="footer">Secretaria do Centro de Ciências Humanas, Letras e Artes (CCHLA) — UFRN</div>
  </div>
</body>
</html>`;
}

function statusGrupoHtml(data) {
  const { solicitante, itens } = data;

  const statusCount = {};
  itens.forEach(i => { statusCount[i.status] = (statusCount[i.status] || 0) + 1; });
  const resumo = Object.entries(statusCount)
    .map(([s, c]) => `${c} ${s === 'Aprovado' ? 'aprovada(s)' : s === 'Reprovado' ? 'reprovada(s)' : 'pendente(s)'}`)
    .join(', ');

  const tickets = [...new Set(itens.map(i => i.ticket))];
  const ticketLabel = tickets.length === 1
    ? `<p style="font-size:16px;font-weight:700;color:#12519e;margin-bottom:12px;">Ticket: ${tickets[0]}</p>`
    : `<p style="font-size:16px;font-weight:700;color:#12519e;margin-bottom:12px;">Tickets: ${tickets.join(', ')}</p>`;

  const linhas = itens.map(item => {
    const cor = item.status === 'Aprovado' ? '#16a34a' : item.status === 'Reprovado' ? '#dc2626' : '#ca8a04';
    const motivoExtra = item.status === 'Reprovado' && item.motivo ? `<br><small style="color:#991b1b;">Motivo: ${item.motivo}</small>` : '';
    return `<tr>
      <td style="padding:10px;border:1px solid #e5e7eb;">${item.auditorio}</td>
      <td style="padding:10px;border:1px solid #e5e7eb;">${item.atividade}</td>
      <td style="padding:10px;border:1px solid #e5e7eb;white-space:nowrap;">${item.data_inicio}</td>
      <td style="padding:10px;border:1px solid #e5e7eb;font-weight:700;color:${cor};">${item.status}${motivoExtra}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>${style}</style></head>
<body>
  <div class="card">
    <h1>Atualização em Lote das Solicitações</h1>
    <p>Olá, <strong>${solicitante}</strong>.</p>
    <p>A secretaria processou suas solicitações de reserva. Confira o resultado de cada uma:</p>
    <p style="font-size:15px;font-weight:600;color:#12519e;">${resumo}</p>
    ${ticketLabel}
    <div class="details-box" style="padding:0;overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f1f5f9;text-align:left;">
            <th style="padding:10px;border:1px solid #e5e7eb;">Local</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">Atividade</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">Período</th>
            <th style="padding:10px;border:1px solid #e5e7eb;">Status</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <div class="btn-container">
      <a href="https://reservas.cchla.ufrn.br/acompanhamento?ticket=${itens[0].ticket}" class="btn" style="color:#ffffff;text-decoration:none;">Acompanhar no Site</a>
    </div>
    <hr>
    <div class="footer">Secretaria do Centro de Ciências Humanas, Letras e Artes (CCHLA) — UFRN</div>
  </div>
</body>
</html>`;
}

exports.enviarConfirmacao = async (data) => {
  await transporter.sendMail({
    from: '"Secretaria CCHLA - Reservas" <mensageiro@cchla.ufrn.br>',
    to: data.email,
    cc: 'reservascchlaufrn@gmail.com, mensageiro@cchla.ufrn.br',
    subject: `Confirmação de Solicitação de Reserva - Ticket: ${data.ticket}`,
    html: confirmacaoHtml(data)
  });
};

exports.enviarStatusUpdate = async (data) => {
  await transporter.sendMail({
    from: '"Secretaria CCHLA - Reservas" <mensageiro@cchla.ufrn.br>',
    to: data.email,
    cc: 'reservascchlaufrn@gmail.com, mensageiro@cchla.ufrn.br',
    subject: `Status da Solicitação - Ticket: ${data.ticket}`,
    html: statusHtml(data)
  });
};

exports.enviarStatusUpdateGrupo = async (data) => {
  const tickets = [...new Set(data.itens.map(i => i.ticket))];
  const subject = tickets.length === 1
    ? `Status da Solicitação - Ticket: ${tickets[0]}`
    : `Atualização em Lote das suas Solicitações (${tickets.length} registros)`;

  await transporter.sendMail({
    from: '"Secretaria CCHLA - Reservas" <mensageiro@cchla.ufrn.br>',
    to: data.email,
    cc: 'reservascchlaufrn@gmail.com, mensageiro@cchla.ufrn.br',
    subject,
    html: statusGrupoHtml(data)
  });
};
