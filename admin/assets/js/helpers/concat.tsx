/**
 * Address
 *
 * @returns {string}
 */
export function concat_address(item) {
	let address = [];

	let streetNumberComplement = '';

	if( item.street )
	{
		streetNumberComplement += item.street;
	}

	if( item.number )
	{
		streetNumberComplement += (item.street ? ', ' : '') + item.number;
	}

	if( item.complement )
	{
		streetNumberComplement += (streetNumberComplement ? ' ' : '') + item.complement;
	}

	if( streetNumberComplement )
	{
		address.push(streetNumberComplement);
	}

	if( item.district )
	{
		address.push(item.district);
	}

	if( item.zipcode )
	{
		address.push('CEP ' + item.zipcode);
	}

	if( item.city )
	{
		address.push(item.city?.name);

		if( item.city.state )
		{
			address.push(item.city?.state?.abbr);
		}
	}

	return address.join(' - ');
}

/**
 * Address enterprise
 *
 * @returns {string}
 */
export function concat_address_enterprise(item) {
	let address = [];

	let streetNumberComplement = '';

	if( item.address_street )
	{
		streetNumberComplement += item.address_street;
	}

	if( item.address_number )
	{
		streetNumberComplement += (item.address_street ? ', ' : '') + item.address_number;
	}

	if( item.complement )
	{
		streetNumberComplement += (streetNumberComplement ? ' ' : '') + item.address_complement;
	}

	if( streetNumberComplement )
	{
		address.push(streetNumberComplement);
	}

	if( item.address_district )
	{
		address.push(item.address_district);
	}

	if( item.address_zip )
	{
		address.push('CEP ' + item.address_zip);
	}

	if( item.address_city )
	{
		address.push(item.address_city);
	}

	if( item.address_state )
	{
		address.push(item.address_state);
	}

	return address.join(' - ');
}
