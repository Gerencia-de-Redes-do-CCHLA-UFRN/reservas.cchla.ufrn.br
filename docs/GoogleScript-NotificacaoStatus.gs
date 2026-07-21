/**
 * Google Apps Script - Notificação de Status
 * 
 * Este script é chamado pelo painel administrativo (painel.html)
 * quando um administrador altera o status de uma solicitação.
 * 
 * ATENÇÃO: O painel.html NÃO contém URLs de script.
 * O backend faz a chamada para este script automaticamente.
 * A URL do script está configurada em backend/controllers/reservaController.js
 *
 * Instalação:
 * 1. Acesse https://script.google.com/
 * 2. Crie um novo projeto na conta mensageiro@cchla.ufrn.br
 * 3. Cole este código
 * 4. Implante como "Web App" com acesso "Qualquer pessoa"
 * 5. Copie a URL gerada e atualize a constante URL_GOOGLE_SCRIPT
 *    em backend/controllers/reservaController.js
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.tipo === 'status_update') {
      enviarEmailStatus(data);
    } else {
      enviarEmailConfirmacao(data);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ sucesso: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (erro) {
    console.error('Erro no doPost:', erro.message);
    return ContentService
      .createTextOutput(JSON.stringify({ sucesso: false, erro: erro.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ativo' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function enviarEmailConfirmacao(data) {
  const destinatario = data.email;
  const ticket = data.ticket || 'N/A';
  const solicitante = data.solicitante || 'Solicitante';
  const auditorio = data.auditorio || 'N/A';
  const atividade = data.atividade || 'N/A';
  const dataInicio = data.data_inicio || 'N/A';
  
  const assunto = 'Confirmação de Solicitação - Ticket ' + ticket;
  
  const corpoHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background-color: #1653A1; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="margin: 0;">Solicitação Recebida</h2>
      </div>
      <div style="padding: 20px;">
        <p>Olá <strong>${solicitante}</strong>,</p>
        <p>Sua solicitação de reserva foi recebida com sucesso e está em análise.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Ticket</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${ticket}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Auditório</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${auditorio}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Atividade</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${atividade}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Data / Horário</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${dataInicio}</td></tr>
        </table>
        <p>Aguardando aprovação da secretaria.</p>
        <p style="color: #666; font-size: 12px;">Este e-mail é automático. Não responda.</p>
      </div>
    </div>
  `;
  
  MailApp.sendEmail({
    to: destinatario,
    subject: assunto,
    htmlBody: corpoHtml
  });
}

function enviarEmailStatus(data) {
  const destinatario = data.email;
  const ticket = data.ticket || 'N/A';
  const solicitante = data.solicitante || 'Solicitante';
  const status = data.status || 'Atualizado';
  const auditorio = data.auditorio || 'N/A';
  const atividade = data.atividade || 'N/A';
  const dataInicio = data.data_inicio || '';
  const motivo = data.motivo || '';
  
  const statusTraduzido = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  
  let corStatus, emojiStatus;
  switch (statusTraduzido) {
    case 'Aprovado':
      corStatus = '#10b981';
      emojiStatus = '✅';
      break;
    case 'Reprovado':
      corStatus = '#ef4444';
      emojiStatus = '❌';
      break;
    default:
      corStatus = '#f59e0b';
      emojiStatus = '⏳';
  }
  
  const assunto = `Status da sua Solicitação foi atualizado - Ticket ${ticket}`;
  
  let motivoHtml = '';
  if (motivo) {
    motivoHtml = `
      <tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Motivo</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #ef4444;">${motivo}</td></tr>
    `;
  }
  
  const corpoHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background-color: ${corStatus}; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="margin: 0;">${emojiStatus} Status Atualizado</h2>
      </div>
      <div style="padding: 20px;">
        <p>Olá <strong>${solicitante}</strong>,</p>
        <p>O status da sua solicitação foi atualizado!</p>
        <div style="text-align: center; padding: 15px; margin: 15px 0; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid ${corStatus};">
          <span style="font-size: 14px; color: #666;">Novo Status</span><br>
          <span style="font-size: 24px; font-weight: bold; color: ${corStatus};">${statusTraduzido}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Ticket</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${ticket}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Auditório</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${auditorio}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Atividade</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${atividade}</td></tr>
          ${dataInicio ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold;">Período</td><td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${dataInicio}</td></tr>` : ''}
          ${motivoHtml}
        </table>
        <p style="color: #666; font-size: 12px;">Este e-mail é automático. Não responda.</p>
      </div>
    </div>
  `;
  
  MailApp.sendEmail({
    to: destinatario,
    subject: assunto,
    htmlBody: corpoHtml
  });
}
