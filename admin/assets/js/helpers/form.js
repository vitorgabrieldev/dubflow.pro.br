/**
 * Create formData
 *
 * @returns {Object|Array}
 */
export function toFormData(data) {
	const form = new FormData();

	for( let key in data )
	{
		if( data.hasOwnProperty(key) )
		{
			formDataPrepare(form, key, data[key]);
		}
	}

	return form;
}

function formDataPrepare(form, key, value) {
	if( value instanceof Array )
	{
		value.forEach((item, key_) => {
			formDataPrepare(form, `${key}[${key_}]`, item);
		});
	}
	else
	{
		if( value === null || value === undefined )
		{
			form.append(key, "");
		}
		else if( value === 1 || value === "1" || value === true || value === "true" )
		{
			form.append(key, 1);
		}
		else if( value === 0 || value === "0" || value === false || value === "false" )
		{
			form.append(key, 0);
		}
		else if( value instanceof File )
		{
			form.append(key, value, value.name);
		}
		else if( typeof value === "object" )
		{
			for( let key_ in value )
			{
				if( value.hasOwnProperty(key_) )
				{
					formDataPrepare(form, `${key}[${key_}]`, value[key_]);
				}
			}
		}
		else
		{
			form.append(key, value);
		}
	}
}

/**
 * Create query string
 *
 * @returns {Object|Array}
 */
export function toQueryString(data) {
	const params = [];

	for( let key in data )
	{
		if( data.hasOwnProperty(key) )
		{
			queryStringPrepare(params, key, data[key]);
		}
	}

	return params.length ? `?${params.join('&')}` : '';
}

function queryStringPrepare(params, key, value) {
	if( value instanceof Array )
	{
		value.forEach((item, key_) => {
			queryStringPrepare(params, `${key}[${key_}]`, item);
		});
	}
	else
	{
		if( value === null || value === undefined )
		{
			params.push(`${encodeURIComponent(key)}=`);
		}
		else if( value === 1 || value === "1" || value === true || value === "true" )
		{
			params.push(`${encodeURIComponent(key)}=1`);
		}
		else if( value === 0 || value === "0" || value === false || value === "false" )
		{
			params.push(`${encodeURIComponent(key)}=0`);
		}
		else if( typeof value === "object" )
		{
			for( let key_ in value )
			{
				if( value.hasOwnProperty(key_) )
				{
					queryStringPrepare(params, `${key}[${key_}]`, value[key_]);
				}
			}
		}
		else
		{
			params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
		}
	}
}

/**
 * Append to formData
 *
 * @returns {string}
 */
export function appendToFormData(form, key, value) {
	if( value instanceof Array )
	{
		value.forEach((item, key_) => {
			appendToFormData(form, `${key}[${key_}]`, item);
		});
	}
	else
	{
		if( value === null || value === undefined )
		{
			form.append(key, "");
		}
		else if( value === 1 || value === "1" || value === true || value === "true" )
		{
			form.append(key, 1);
		}
		else if( value === 0 || value === "0" || value === false || value === "false" )
		{
			form.append(key, 0);
		}
		else if( typeof value === "object" && value.hasOwnProperty("uri") && value.hasOwnProperty("type") && value.hasOwnProperty("name") )
		{
			form.append(key, value, value.name);
		}
		else
		{
			form.append(key, value);
		}
	}
}

/**
 * Convert a base64 string in a Blob according to the data and contentType.
 *
 * @param base64 {string} Pure base64 string without contentType
 * @param contentType {string} the content type of the file i.e (image/jpeg - image/png - text/plain)
 * @param sliceSize {int} SliceSize to process the byteCharacters
 *
 * @see http://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
 *
 * @return Blob
 */
export function base64toBlob(base64, contentType, sliceSize = 512) {
	contentType = contentType || '';

	const byteCharacters = atob(base64);
	const byteArrays     = [];

	for( let offset = 0; offset < byteCharacters.length; offset += sliceSize )
	{
		const slice = byteCharacters.slice(offset, offset + sliceSize);

		const byteNumbers = new Array(slice.length);

		for( let i = 0; i < slice.length; i++ )
		{
			byteNumbers[i] = slice.charCodeAt(i);
		}

		byteArrays.push(new Uint8Array(byteNumbers));
	}

	return new Blob(byteArrays, {type: contentType});
}