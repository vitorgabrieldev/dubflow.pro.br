export const NOTIFICATION_TYPE_OPTIONS = [
	{value: "admin.manual", label: "Manual (admin)"},
	{value: "achievement_unlocked", label: "Conquista desbloqueada"},
	{value: "chat_message_received", label: "Mensagem recebida"},
	{value: "comment_reply_received", label: "Resposta em comentário"},
	{value: "dubbing_test_result_released", label: "Resultado de teste liberado"},
	{value: "organization_followed", label: "Comunidade seguida"},
	{value: "organization_member_invited", label: "Convite para comunidade"},
	{value: "organization_member_invite_responded", label: "Resposta de convite"},
	{value: "organization_member_joined", label: "Novo membro na comunidade"},
	{value: "organization_owner_transfer_requested", label: "Transferência de dono solicitada"},
	{value: "organization_owner_transfer_responded", label: "Resposta de transferência de dono"},
	{value: "organization_post_commented", label: "Novo comentário em post"},
	{value: "organization_published_post", label: "Novo episódio publicado"},
	{value: "post_collaboration_requested", label: "Convite de colaboração"},
	{value: "post_collaboration_responded", label: "Resposta de colaboração"},
];

export const getNotificationTypeLabel = (value) => {
	const selected = NOTIFICATION_TYPE_OPTIONS.find((item) => item.value === value);
	return selected?.label || value || "-";
};
