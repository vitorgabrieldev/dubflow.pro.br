import { api } from "./../config/api";

function parseDownloadName(contentDisposition, fallbackName) {
	if( !contentDisposition || typeof contentDisposition !== "string" )
	{
		return fallbackName;
	}

	const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
	if( utf8Match && utf8Match[1] )
	{
		return decodeURIComponent(utf8Match[1].trim());
	}

	const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
	if( fileNameMatch && fileNameMatch[1] )
	{
		return fileNameMatch[1].trim();
	}

	return fallbackName;
}

export async function downloadPrivateFile(fileUrl, fallbackName = "export.csv") {
	if( !fileUrl )
	{
		throw new Error("Arquivo de download inválido.");
	}

	const response = await api.get(fileUrl, {
		responseType: "blob",
	});

	const blob = response.data instanceof Blob
		? response.data
		: new Blob([response.data], {type: "text/csv;charset=utf-8"});

	const contentDisposition = response.headers?.["content-disposition"] || "";
	const fileName = parseDownloadName(contentDisposition, fallbackName);
	const blobUrl = window.URL.createObjectURL(blob);

	const anchor = document.createElement("a");
	anchor.href = blobUrl;
	anchor.download = fileName;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	window.URL.revokeObjectURL(blobUrl);
}
