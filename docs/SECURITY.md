# Segurança e privacidade — estado atual

Controles presentes: scrypt com salt aleatório para senhas; comparação em tempo constante; token aleatório opaco guardado no cookie HttpOnly/SameSite Strict e somente hash do token no banco; expiração configurável; modo `Secure` em produção; consultas SQL parametrizadas; validação de campos; autorização por proprietário; CSP, nosniff, referrer policy e escape de texto no cliente.

Pendências antes de serviço público: rate limiting e proteção contra abuso de login/busca, HTTPS e configuração confiável de proxy, CSRF reforçada por Origin/CSRF token, recuperação/verificação e exclusão de conta, política de privacidade e termos revisados, exportação/retensão, auditoria estruturada sem dados sensíveis, moderação/denúncias, revisão independente e processo de incidentes. A implementação não afirma conformidade jurídica nem proteção absoluta contra trapaça.
