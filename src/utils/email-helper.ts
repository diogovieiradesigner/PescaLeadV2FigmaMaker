/**
 * Utilitário para abrir cliente de e-mail com compose preparado
 */

// ✅ Flag para evitar execução dupla
let isOpening = false;

/**
 * Abre o Gmail com compose preparado para o e-mail especificado
 * Se o Gmail não abrir (popup bloqueado), usa mailto: como fallback
 * 
 * @param email - Endereço de e-mail do destinatário
 * @param subject - Assunto do e-mail (opcional)
 * @param body - Corpo do e-mail (opcional)
 */
export function openEmailCompose(email: string, subject?: string, body?: string): void {
  // ✅ Prevenir execução dupla
  if (isOpening) {
    return;
  }

  if (!email || !email.includes('@')) {
    return;
  }

  isOpening = true;

  // Construir URL do Gmail
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: email
  });
  
  if (subject) {
    params.append('su', subject);
  }
  
  if (body) {
    params.append('body', body);
  }
  
  const gmailUrl = `https://mail.google.com/mail/?${params.toString()}`;
  
  // Tentar abrir Gmail em nova aba
  try {
    const gmailWindow = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    
    // ✅ CORREÇÃO: Verificar se popup foi bloqueado apenas se window.open retornar null
    // Se window.open retornar null, significa que o popup foi bloqueado
    if (!gmailWindow) {
      // Popup foi bloqueado - usar fallback mailto:
      openMailto(email, subject, body);
      // Resetar flag imediatamente após usar fallback
      setTimeout(() => {
        isOpening = false;
      }, 500);
    } else {
      // ✅ Gmail foi aberto com sucesso - NÃO executar fallback
      // Resetar flag após um tempo para permitir nova abertura
      setTimeout(() => {
        isOpening = false;
      }, 1000);
    }
  } catch (error) {
    console.error('[EMAIL HELPER] ❌ Erro ao abrir Gmail:', error);
    // Apenas em caso de erro, usar fallback
    openMailto(email, subject, body);
    setTimeout(() => {
      isOpening = false;
    }, 500);
  }
}

/**
 * Abre o cliente de e-mail padrão usando mailto:
 * 
 * @param email - Endereço de e-mail do destinatário
 * @param subject - Assunto do e-mail (opcional)
 * @param body - Corpo do e-mail (opcional)
 */
function openMailto(email: string, subject?: string, body?: string): void {
  
  let mailtoUrl = `mailto:${encodeURIComponent(email)}`;
  
  const mailtoParams: string[] = [];
  if (subject) {
    mailtoParams.push(`subject=${encodeURIComponent(subject)}`);
  }
  if (body) {
    mailtoParams.push(`body=${encodeURIComponent(body)}`);
  }
  
  if (mailtoParams.length > 0) {
    mailtoUrl += `?${mailtoParams.join('&')}`;
  }
  
  // ✅ Usar window.open em vez de window.location.href para evitar conflitos
  // window.location.href pode causar problemas quando já há uma janela aberta
  const mailtoWindow = window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
  
  // Se window.open falhar (pouco provável com mailto:), usar location.href como último recurso
  if (!mailtoWindow) {
    // Apenas como último recurso
    window.location.href = mailtoUrl;
  } else {
  }
}

