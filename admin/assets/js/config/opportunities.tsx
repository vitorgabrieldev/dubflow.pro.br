export const OPPORTUNITY_STATUS_OPTIONS = [
	{value: "draft", label: "Rascunho"},
	{value: "published", label: "Publicado"},
	{value: "closed", label: "Encerrado"},
	{value: "results_released", label: "Resultados liberados"},
	{value: "archived", label: "Arquivado"},
];

export const OPPORTUNITY_VISIBILITY_OPTIONS = [
	{value: "external", label: "Externa"},
	{value: "internal", label: "Interna"},
];

export const getOpportunityStatusLabel = (value) => {
	const selected = OPPORTUNITY_STATUS_OPTIONS.find((item) => item.value === value);
	return selected?.label || value || "-";
};

export const getOpportunityVisibilityLabel = (value) => {
	const selected = OPPORTUNITY_VISIBILITY_OPTIONS.find((item) => item.value === value);
	return selected?.label || value || "-";
};
