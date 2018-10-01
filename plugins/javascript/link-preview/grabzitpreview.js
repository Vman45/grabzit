function GrabzIt(key)
{
	return new (function(key)
	{
		this.key = key;
		this.data = null;
		this.dataKey = null;
		this.options = null;
		this.post = false;
		this.elem = null;
		this.protocol = null;
		this.encrypt = false;
		this.postVars = '';
		this.tVars = '';
		this.retried = false;

		this.aesjs = (function() {

						function checkInt(value) {
							return (parseInt(value) === value);
						}

						function checkInts(arrayish) {
							if (!checkInt(arrayish.length)) { return false; }

							for (var i = 0; i < arrayish.length; i++) {
								if (!checkInt(arrayish[i]) || arrayish[i] < 0 || arrayish[i] > 255) {
									return false;
								}
							}

							return true;
						}

						function coerceArray(arg, copy) {

							// ArrayBuffer view
							if (arg.buffer && ArrayBuffer.isView(arg) && arg.name === 'Uint8Array') {

								if (copy) {
									if (arg.slice) {
										arg = arg.slice();
									} else {
										arg = Array.prototype.slice.call(arg);
									}
								}

								return arg;
							}

							// It's an array; check it is a valid representation of a byte
							if (Array.isArray(arg)) {
								if (!checkInts(arg)) {
									throw new Error('Array contains invalid value: ' + arg);
								}

								return new Uint8Array(arg);
							}

							// Something else, but behaves like an array (maybe a Buffer? Arguments?)
							if (checkInt(arg.length) && checkInts(arg)) {
								return new Uint8Array(arg);
							}

							throw new Error('unsupported array-like object');
						}

						function createArray(length) {
							return new Uint8Array(length);
						}

						function copyArray(sourceArray, targetArray, targetStart, sourceStart, sourceEnd) {
							if (sourceStart != null || sourceEnd != null) {
								if (sourceArray.slice) {
									sourceArray = sourceArray.slice(sourceStart, sourceEnd);
								} else {
									sourceArray = Array.prototype.slice.call(sourceArray, sourceStart, sourceEnd);
								}
							}
							targetArray.set(sourceArray, targetStart);
						}


						// Number of rounds by keysize
						var numberOfRounds = {16: 10, 24: 12, 32: 14}

						// Round constant words
						var rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91];

						// S-box and Inverse S-box (S is for Substitution)
						var S = [0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16];
						var Si =[0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e, 0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84, 0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73, 0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4, 0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f, 0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61, 0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d];

						// Transformations for decryption
						var T5 = [0x51f4a750, 0x7e416553, 0x1a17a4c3, 0x3a275e96, 0x3bab6bcb, 0x1f9d45f1, 0xacfa58ab, 0x4be30393, 0x2030fa55, 0xad766df6, 0x88cc7691, 0xf5024c25, 0x4fe5d7fc, 0xc52acbd7, 0x26354480, 0xb562a38f, 0xdeb15a49, 0x25ba1b67, 0x45ea0e98, 0x5dfec0e1, 0xc32f7502, 0x814cf012, 0x8d4697a3, 0x6bd3f9c6, 0x038f5fe7, 0x15929c95, 0xbf6d7aeb, 0x955259da, 0xd4be832d, 0x587421d3, 0x49e06929, 0x8ec9c844, 0x75c2896a, 0xf48e7978, 0x99583e6b, 0x27b971dd, 0xbee14fb6, 0xf088ad17, 0xc920ac66, 0x7dce3ab4, 0x63df4a18, 0xe51a3182, 0x97513360, 0x62537f45, 0xb16477e0, 0xbb6bae84, 0xfe81a01c, 0xf9082b94, 0x70486858, 0x8f45fd19, 0x94de6c87, 0x527bf8b7, 0xab73d323, 0x724b02e2, 0xe31f8f57, 0x6655ab2a, 0xb2eb2807, 0x2fb5c203, 0x86c57b9a, 0xd33708a5, 0x302887f2, 0x23bfa5b2, 0x02036aba, 0xed16825c, 0x8acf1c2b, 0xa779b492, 0xf307f2f0, 0x4e69e2a1, 0x65daf4cd, 0x0605bed5, 0xd134621f, 0xc4a6fe8a, 0x342e539d, 0xa2f355a0, 0x058ae132, 0xa4f6eb75, 0x0b83ec39, 0x4060efaa, 0x5e719f06, 0xbd6e1051, 0x3e218af9, 0x96dd063d, 0xdd3e05ae, 0x4de6bd46, 0x91548db5, 0x71c45d05, 0x0406d46f, 0x605015ff, 0x1998fb24, 0xd6bde997, 0x894043cc, 0x67d99e77, 0xb0e842bd, 0x07898b88, 0xe7195b38, 0x79c8eedb, 0xa17c0a47, 0x7c420fe9, 0xf8841ec9, 0x00000000, 0x09808683, 0x322bed48, 0x1e1170ac, 0x6c5a724e, 0xfd0efffb, 0x0f853856, 0x3daed51e, 0x362d3927, 0x0a0fd964, 0x685ca621, 0x9b5b54d1, 0x24362e3a, 0x0c0a67b1, 0x9357e70f, 0xb4ee96d2, 0x1b9b919e, 0x80c0c54f, 0x61dc20a2, 0x5a774b69, 0x1c121a16, 0xe293ba0a, 0xc0a02ae5, 0x3c22e043, 0x121b171d, 0x0e090d0b, 0xf28bc7ad, 0x2db6a8b9, 0x141ea9c8, 0x57f11985, 0xaf75074c, 0xee99ddbb, 0xa37f60fd, 0xf701269f, 0x5c72f5bc, 0x44663bc5, 0x5bfb7e34, 0x8b432976, 0xcb23c6dc, 0xb6edfc68, 0xb8e4f163, 0xd731dcca, 0x42638510, 0x13972240, 0x84c61120, 0x854a247d, 0xd2bb3df8, 0xaef93211, 0xc729a16d, 0x1d9e2f4b, 0xdcb230f3, 0x0d8652ec, 0x77c1e3d0, 0x2bb3166c, 0xa970b999, 0x119448fa, 0x47e96422, 0xa8fc8cc4, 0xa0f03f1a, 0x567d2cd8, 0x223390ef, 0x87494ec7, 0xd938d1c1, 0x8ccaa2fe, 0x98d40b36, 0xa6f581cf, 0xa57ade28, 0xdab78e26, 0x3fadbfa4, 0x2c3a9de4, 0x5078920d, 0x6a5fcc9b, 0x547e4662, 0xf68d13c2, 0x90d8b8e8, 0x2e39f75e, 0x82c3aff5, 0x9f5d80be, 0x69d0937c, 0x6fd52da9, 0xcf2512b3, 0xc8ac993b, 0x10187da7, 0xe89c636e, 0xdb3bbb7b, 0xcd267809, 0x6e5918f4, 0xec9ab701, 0x834f9aa8, 0xe6956e65, 0xaaffe67e, 0x21bccf08, 0xef15e8e6, 0xbae79bd9, 0x4a6f36ce, 0xea9f09d4, 0x29b07cd6, 0x31a4b2af, 0x2a3f2331, 0xc6a59430, 0x35a266c0, 0x744ebc37, 0xfc82caa6, 0xe090d0b0, 0x33a7d815, 0xf104984a, 0x41ecdaf7, 0x7fcd500e, 0x1791f62f, 0x764dd68d, 0x43efb04d, 0xccaa4d54, 0xe49604df, 0x9ed1b5e3, 0x4c6a881b, 0xc12c1fb8, 0x4665517f, 0x9d5eea04, 0x018c355d, 0xfa877473, 0xfb0b412e, 0xb3671d5a, 0x92dbd252, 0xe9105633, 0x6dd64713, 0x9ad7618c, 0x37a10c7a, 0x59f8148e, 0xeb133c89, 0xcea927ee, 0xb761c935, 0xe11ce5ed, 0x7a47b13c, 0x9cd2df59, 0x55f2733f, 0x1814ce79, 0x73c737bf, 0x53f7cdea, 0x5ffdaa5b, 0xdf3d6f14, 0x7844db86, 0xcaaff381, 0xb968c43e, 0x3824342c, 0xc2a3405f, 0x161dc372, 0xbce2250c, 0x283c498b, 0xff0d9541, 0x39a80171, 0x080cb3de, 0xd8b4e49c, 0x6456c190, 0x7bcb8461, 0xd532b670, 0x486c5c74, 0xd0b85742];
						var T6 = [0x5051f4a7, 0x537e4165, 0xc31a17a4, 0x963a275e, 0xcb3bab6b, 0xf11f9d45, 0xabacfa58, 0x934be303, 0x552030fa, 0xf6ad766d, 0x9188cc76, 0x25f5024c, 0xfc4fe5d7, 0xd7c52acb, 0x80263544, 0x8fb562a3, 0x49deb15a, 0x6725ba1b, 0x9845ea0e, 0xe15dfec0, 0x02c32f75, 0x12814cf0, 0xa38d4697, 0xc66bd3f9, 0xe7038f5f, 0x9515929c, 0xebbf6d7a, 0xda955259, 0x2dd4be83, 0xd3587421, 0x2949e069, 0x448ec9c8, 0x6a75c289, 0x78f48e79, 0x6b99583e, 0xdd27b971, 0xb6bee14f, 0x17f088ad, 0x66c920ac, 0xb47dce3a, 0x1863df4a, 0x82e51a31, 0x60975133, 0x4562537f, 0xe0b16477, 0x84bb6bae, 0x1cfe81a0, 0x94f9082b, 0x58704868, 0x198f45fd, 0x8794de6c, 0xb7527bf8, 0x23ab73d3, 0xe2724b02, 0x57e31f8f, 0x2a6655ab, 0x07b2eb28, 0x032fb5c2, 0x9a86c57b, 0xa5d33708, 0xf2302887, 0xb223bfa5, 0xba02036a, 0x5ced1682, 0x2b8acf1c, 0x92a779b4, 0xf0f307f2, 0xa14e69e2, 0xcd65daf4, 0xd50605be, 0x1fd13462, 0x8ac4a6fe, 0x9d342e53, 0xa0a2f355, 0x32058ae1, 0x75a4f6eb, 0x390b83ec, 0xaa4060ef, 0x065e719f, 0x51bd6e10, 0xf93e218a, 0x3d96dd06, 0xaedd3e05, 0x464de6bd, 0xb591548d, 0x0571c45d, 0x6f0406d4, 0xff605015, 0x241998fb, 0x97d6bde9, 0xcc894043, 0x7767d99e, 0xbdb0e842, 0x8807898b, 0x38e7195b, 0xdb79c8ee, 0x47a17c0a, 0xe97c420f, 0xc9f8841e, 0x00000000, 0x83098086, 0x48322bed, 0xac1e1170, 0x4e6c5a72, 0xfbfd0eff, 0x560f8538, 0x1e3daed5, 0x27362d39, 0x640a0fd9, 0x21685ca6, 0xd19b5b54, 0x3a24362e, 0xb10c0a67, 0x0f9357e7, 0xd2b4ee96, 0x9e1b9b91, 0x4f80c0c5, 0xa261dc20, 0x695a774b, 0x161c121a, 0x0ae293ba, 0xe5c0a02a, 0x433c22e0, 0x1d121b17, 0x0b0e090d, 0xadf28bc7, 0xb92db6a8, 0xc8141ea9, 0x8557f119, 0x4caf7507, 0xbbee99dd, 0xfda37f60, 0x9ff70126, 0xbc5c72f5, 0xc544663b, 0x345bfb7e, 0x768b4329, 0xdccb23c6, 0x68b6edfc, 0x63b8e4f1, 0xcad731dc, 0x10426385, 0x40139722, 0x2084c611, 0x7d854a24, 0xf8d2bb3d, 0x11aef932, 0x6dc729a1, 0x4b1d9e2f, 0xf3dcb230, 0xec0d8652, 0xd077c1e3, 0x6c2bb316, 0x99a970b9, 0xfa119448, 0x2247e964, 0xc4a8fc8c, 0x1aa0f03f, 0xd8567d2c, 0xef223390, 0xc787494e, 0xc1d938d1, 0xfe8ccaa2, 0x3698d40b, 0xcfa6f581, 0x28a57ade, 0x26dab78e, 0xa43fadbf, 0xe42c3a9d, 0x0d507892, 0x9b6a5fcc, 0x62547e46, 0xc2f68d13, 0xe890d8b8, 0x5e2e39f7, 0xf582c3af, 0xbe9f5d80, 0x7c69d093, 0xa96fd52d, 0xb3cf2512, 0x3bc8ac99, 0xa710187d, 0x6ee89c63, 0x7bdb3bbb, 0x09cd2678, 0xf46e5918, 0x01ec9ab7, 0xa8834f9a, 0x65e6956e, 0x7eaaffe6, 0x0821bccf, 0xe6ef15e8, 0xd9bae79b, 0xce4a6f36, 0xd4ea9f09, 0xd629b07c, 0xaf31a4b2, 0x312a3f23, 0x30c6a594, 0xc035a266, 0x37744ebc, 0xa6fc82ca, 0xb0e090d0, 0x1533a7d8, 0x4af10498, 0xf741ecda, 0x0e7fcd50, 0x2f1791f6, 0x8d764dd6, 0x4d43efb0, 0x54ccaa4d, 0xdfe49604, 0xe39ed1b5, 0x1b4c6a88, 0xb8c12c1f, 0x7f466551, 0x049d5eea, 0x5d018c35, 0x73fa8774, 0x2efb0b41, 0x5ab3671d, 0x5292dbd2, 0x33e91056, 0x136dd647, 0x8c9ad761, 0x7a37a10c, 0x8e59f814, 0x89eb133c, 0xeecea927, 0x35b761c9, 0xede11ce5, 0x3c7a47b1, 0x599cd2df, 0x3f55f273, 0x791814ce, 0xbf73c737, 0xea53f7cd, 0x5b5ffdaa, 0x14df3d6f, 0x867844db, 0x81caaff3, 0x3eb968c4, 0x2c382434, 0x5fc2a340, 0x72161dc3, 0x0cbce225, 0x8b283c49, 0x41ff0d95, 0x7139a801, 0xde080cb3, 0x9cd8b4e4, 0x906456c1, 0x617bcb84, 0x70d532b6, 0x74486c5c, 0x42d0b857];
						var T7 = [0xa75051f4, 0x65537e41, 0xa4c31a17, 0x5e963a27, 0x6bcb3bab, 0x45f11f9d, 0x58abacfa, 0x03934be3, 0xfa552030, 0x6df6ad76, 0x769188cc, 0x4c25f502, 0xd7fc4fe5, 0xcbd7c52a, 0x44802635, 0xa38fb562, 0x5a49deb1, 0x1b6725ba, 0x0e9845ea, 0xc0e15dfe, 0x7502c32f, 0xf012814c, 0x97a38d46, 0xf9c66bd3, 0x5fe7038f, 0x9c951592, 0x7aebbf6d, 0x59da9552, 0x832dd4be, 0x21d35874, 0x692949e0, 0xc8448ec9, 0x896a75c2, 0x7978f48e, 0x3e6b9958, 0x71dd27b9, 0x4fb6bee1, 0xad17f088, 0xac66c920, 0x3ab47dce, 0x4a1863df, 0x3182e51a, 0x33609751, 0x7f456253, 0x77e0b164, 0xae84bb6b, 0xa01cfe81, 0x2b94f908, 0x68587048, 0xfd198f45, 0x6c8794de, 0xf8b7527b, 0xd323ab73, 0x02e2724b, 0x8f57e31f, 0xab2a6655, 0x2807b2eb, 0xc2032fb5, 0x7b9a86c5, 0x08a5d337, 0x87f23028, 0xa5b223bf, 0x6aba0203, 0x825ced16, 0x1c2b8acf, 0xb492a779, 0xf2f0f307, 0xe2a14e69, 0xf4cd65da, 0xbed50605, 0x621fd134, 0xfe8ac4a6, 0x539d342e, 0x55a0a2f3, 0xe132058a, 0xeb75a4f6, 0xec390b83, 0xefaa4060, 0x9f065e71, 0x1051bd6e, 0x8af93e21, 0x063d96dd, 0x05aedd3e, 0xbd464de6, 0x8db59154, 0x5d0571c4, 0xd46f0406, 0x15ff6050, 0xfb241998, 0xe997d6bd, 0x43cc8940, 0x9e7767d9, 0x42bdb0e8, 0x8b880789, 0x5b38e719, 0xeedb79c8, 0x0a47a17c, 0x0fe97c42, 0x1ec9f884, 0x00000000, 0x86830980, 0xed48322b, 0x70ac1e11, 0x724e6c5a, 0xfffbfd0e, 0x38560f85, 0xd51e3dae, 0x3927362d, 0xd9640a0f, 0xa621685c, 0x54d19b5b, 0x2e3a2436, 0x67b10c0a, 0xe70f9357, 0x96d2b4ee, 0x919e1b9b, 0xc54f80c0, 0x20a261dc, 0x4b695a77, 0x1a161c12, 0xba0ae293, 0x2ae5c0a0, 0xe0433c22, 0x171d121b, 0x0d0b0e09, 0xc7adf28b, 0xa8b92db6, 0xa9c8141e, 0x198557f1, 0x074caf75, 0xddbbee99, 0x60fda37f, 0x269ff701, 0xf5bc5c72, 0x3bc54466, 0x7e345bfb, 0x29768b43, 0xc6dccb23, 0xfc68b6ed, 0xf163b8e4, 0xdccad731, 0x85104263, 0x22401397, 0x112084c6, 0x247d854a, 0x3df8d2bb, 0x3211aef9, 0xa16dc729, 0x2f4b1d9e, 0x30f3dcb2, 0x52ec0d86, 0xe3d077c1, 0x166c2bb3, 0xb999a970, 0x48fa1194, 0x642247e9, 0x8cc4a8fc, 0x3f1aa0f0, 0x2cd8567d, 0x90ef2233, 0x4ec78749, 0xd1c1d938, 0xa2fe8cca, 0x0b3698d4, 0x81cfa6f5, 0xde28a57a, 0x8e26dab7, 0xbfa43fad, 0x9de42c3a, 0x920d5078, 0xcc9b6a5f, 0x4662547e, 0x13c2f68d, 0xb8e890d8, 0xf75e2e39, 0xaff582c3, 0x80be9f5d, 0x937c69d0, 0x2da96fd5, 0x12b3cf25, 0x993bc8ac, 0x7da71018, 0x636ee89c, 0xbb7bdb3b, 0x7809cd26, 0x18f46e59, 0xb701ec9a, 0x9aa8834f, 0x6e65e695, 0xe67eaaff, 0xcf0821bc, 0xe8e6ef15, 0x9bd9bae7, 0x36ce4a6f, 0x09d4ea9f, 0x7cd629b0, 0xb2af31a4, 0x23312a3f, 0x9430c6a5, 0x66c035a2, 0xbc37744e, 0xcaa6fc82, 0xd0b0e090, 0xd81533a7, 0x984af104, 0xdaf741ec, 0x500e7fcd, 0xf62f1791, 0xd68d764d, 0xb04d43ef, 0x4d54ccaa, 0x04dfe496, 0xb5e39ed1, 0x881b4c6a, 0x1fb8c12c, 0x517f4665, 0xea049d5e, 0x355d018c, 0x7473fa87, 0x412efb0b, 0x1d5ab367, 0xd25292db, 0x5633e910, 0x47136dd6, 0x618c9ad7, 0x0c7a37a1, 0x148e59f8, 0x3c89eb13, 0x27eecea9, 0xc935b761, 0xe5ede11c, 0xb13c7a47, 0xdf599cd2, 0x733f55f2, 0xce791814, 0x37bf73c7, 0xcdea53f7, 0xaa5b5ffd, 0x6f14df3d, 0xdb867844, 0xf381caaf, 0xc43eb968, 0x342c3824, 0x405fc2a3, 0xc372161d, 0x250cbce2, 0x498b283c, 0x9541ff0d, 0x017139a8, 0xb3de080c, 0xe49cd8b4, 0xc1906456, 0x84617bcb, 0xb670d532, 0x5c74486c, 0x5742d0b8];
						var T8 = [0xf4a75051, 0x4165537e, 0x17a4c31a, 0x275e963a, 0xab6bcb3b, 0x9d45f11f, 0xfa58abac, 0xe303934b, 0x30fa5520, 0x766df6ad, 0xcc769188, 0x024c25f5, 0xe5d7fc4f, 0x2acbd7c5, 0x35448026, 0x62a38fb5, 0xb15a49de, 0xba1b6725, 0xea0e9845, 0xfec0e15d, 0x2f7502c3, 0x4cf01281, 0x4697a38d, 0xd3f9c66b, 0x8f5fe703, 0x929c9515, 0x6d7aebbf, 0x5259da95, 0xbe832dd4, 0x7421d358, 0xe0692949, 0xc9c8448e, 0xc2896a75, 0x8e7978f4, 0x583e6b99, 0xb971dd27, 0xe14fb6be, 0x88ad17f0, 0x20ac66c9, 0xce3ab47d, 0xdf4a1863, 0x1a3182e5, 0x51336097, 0x537f4562, 0x6477e0b1, 0x6bae84bb, 0x81a01cfe, 0x082b94f9, 0x48685870, 0x45fd198f, 0xde6c8794, 0x7bf8b752, 0x73d323ab, 0x4b02e272, 0x1f8f57e3, 0x55ab2a66, 0xeb2807b2, 0xb5c2032f, 0xc57b9a86, 0x3708a5d3, 0x2887f230, 0xbfa5b223, 0x036aba02, 0x16825ced, 0xcf1c2b8a, 0x79b492a7, 0x07f2f0f3, 0x69e2a14e, 0xdaf4cd65, 0x05bed506, 0x34621fd1, 0xa6fe8ac4, 0x2e539d34, 0xf355a0a2, 0x8ae13205, 0xf6eb75a4, 0x83ec390b, 0x60efaa40, 0x719f065e, 0x6e1051bd, 0x218af93e, 0xdd063d96, 0x3e05aedd, 0xe6bd464d, 0x548db591, 0xc45d0571, 0x06d46f04, 0x5015ff60, 0x98fb2419, 0xbde997d6, 0x4043cc89, 0xd99e7767, 0xe842bdb0, 0x898b8807, 0x195b38e7, 0xc8eedb79, 0x7c0a47a1, 0x420fe97c, 0x841ec9f8, 0x00000000, 0x80868309, 0x2bed4832, 0x1170ac1e, 0x5a724e6c, 0x0efffbfd, 0x8538560f, 0xaed51e3d, 0x2d392736, 0x0fd9640a, 0x5ca62168, 0x5b54d19b, 0x362e3a24, 0x0a67b10c, 0x57e70f93, 0xee96d2b4, 0x9b919e1b, 0xc0c54f80, 0xdc20a261, 0x774b695a, 0x121a161c, 0x93ba0ae2, 0xa02ae5c0, 0x22e0433c, 0x1b171d12, 0x090d0b0e, 0x8bc7adf2, 0xb6a8b92d, 0x1ea9c814, 0xf1198557, 0x75074caf, 0x99ddbbee, 0x7f60fda3, 0x01269ff7, 0x72f5bc5c, 0x663bc544, 0xfb7e345b, 0x4329768b, 0x23c6dccb, 0xedfc68b6, 0xe4f163b8, 0x31dccad7, 0x63851042, 0x97224013, 0xc6112084, 0x4a247d85, 0xbb3df8d2, 0xf93211ae, 0x29a16dc7, 0x9e2f4b1d, 0xb230f3dc, 0x8652ec0d, 0xc1e3d077, 0xb3166c2b, 0x70b999a9, 0x9448fa11, 0xe9642247, 0xfc8cc4a8, 0xf03f1aa0, 0x7d2cd856, 0x3390ef22, 0x494ec787, 0x38d1c1d9, 0xcaa2fe8c, 0xd40b3698, 0xf581cfa6, 0x7ade28a5, 0xb78e26da, 0xadbfa43f, 0x3a9de42c, 0x78920d50, 0x5fcc9b6a, 0x7e466254, 0x8d13c2f6, 0xd8b8e890, 0x39f75e2e, 0xc3aff582, 0x5d80be9f, 0xd0937c69, 0xd52da96f, 0x2512b3cf, 0xac993bc8, 0x187da710, 0x9c636ee8, 0x3bbb7bdb, 0x267809cd, 0x5918f46e, 0x9ab701ec, 0x4f9aa883, 0x956e65e6, 0xffe67eaa, 0xbccf0821, 0x15e8e6ef, 0xe79bd9ba, 0x6f36ce4a, 0x9f09d4ea, 0xb07cd629, 0xa4b2af31, 0x3f23312a, 0xa59430c6, 0xa266c035, 0x4ebc3774, 0x82caa6fc, 0x90d0b0e0, 0xa7d81533, 0x04984af1, 0xecdaf741, 0xcd500e7f, 0x91f62f17, 0x4dd68d76, 0xefb04d43, 0xaa4d54cc, 0x9604dfe4, 0xd1b5e39e, 0x6a881b4c, 0x2c1fb8c1, 0x65517f46, 0x5eea049d, 0x8c355d01, 0x877473fa, 0x0b412efb, 0x671d5ab3, 0xdbd25292, 0x105633e9, 0xd647136d, 0xd7618c9a, 0xa10c7a37, 0xf8148e59, 0x133c89eb, 0xa927eece, 0x61c935b7, 0x1ce5ede1, 0x47b13c7a, 0xd2df599c, 0xf2733f55, 0x14ce7918, 0xc737bf73, 0xf7cdea53, 0xfdaa5b5f, 0x3d6f14df, 0x44db8678, 0xaff381ca, 0x68c43eb9, 0x24342c38, 0xa3405fc2, 0x1dc37216, 0xe2250cbc, 0x3c498b28, 0x0d9541ff, 0xa8017139, 0x0cb3de08, 0xb4e49cd8, 0x56c19064, 0xcb84617b, 0x32b670d5, 0x6c5c7448, 0xb85742d0];

						// Transformations for decryption key expansion
						var U1 = [0x00000000, 0x0e090d0b, 0x1c121a16, 0x121b171d, 0x3824342c, 0x362d3927, 0x24362e3a, 0x2a3f2331, 0x70486858, 0x7e416553, 0x6c5a724e, 0x62537f45, 0x486c5c74, 0x4665517f, 0x547e4662, 0x5a774b69, 0xe090d0b0, 0xee99ddbb, 0xfc82caa6, 0xf28bc7ad, 0xd8b4e49c, 0xd6bde997, 0xc4a6fe8a, 0xcaaff381, 0x90d8b8e8, 0x9ed1b5e3, 0x8ccaa2fe, 0x82c3aff5, 0xa8fc8cc4, 0xa6f581cf, 0xb4ee96d2, 0xbae79bd9, 0xdb3bbb7b, 0xd532b670, 0xc729a16d, 0xc920ac66, 0xe31f8f57, 0xed16825c, 0xff0d9541, 0xf104984a, 0xab73d323, 0xa57ade28, 0xb761c935, 0xb968c43e, 0x9357e70f, 0x9d5eea04, 0x8f45fd19, 0x814cf012, 0x3bab6bcb, 0x35a266c0, 0x27b971dd, 0x29b07cd6, 0x038f5fe7, 0x0d8652ec, 0x1f9d45f1, 0x119448fa, 0x4be30393, 0x45ea0e98, 0x57f11985, 0x59f8148e, 0x73c737bf, 0x7dce3ab4, 0x6fd52da9, 0x61dc20a2, 0xad766df6, 0xa37f60fd, 0xb16477e0, 0xbf6d7aeb, 0x955259da, 0x9b5b54d1, 0x894043cc, 0x87494ec7, 0xdd3e05ae, 0xd33708a5, 0xc12c1fb8, 0xcf2512b3, 0xe51a3182, 0xeb133c89, 0xf9082b94, 0xf701269f, 0x4de6bd46, 0x43efb04d, 0x51f4a750, 0x5ffdaa5b, 0x75c2896a, 0x7bcb8461, 0x69d0937c, 0x67d99e77, 0x3daed51e, 0x33a7d815, 0x21bccf08, 0x2fb5c203, 0x058ae132, 0x0b83ec39, 0x1998fb24, 0x1791f62f, 0x764dd68d, 0x7844db86, 0x6a5fcc9b, 0x6456c190, 0x4e69e2a1, 0x4060efaa, 0x527bf8b7, 0x5c72f5bc, 0x0605bed5, 0x080cb3de, 0x1a17a4c3, 0x141ea9c8, 0x3e218af9, 0x302887f2, 0x223390ef, 0x2c3a9de4, 0x96dd063d, 0x98d40b36, 0x8acf1c2b, 0x84c61120, 0xaef93211, 0xa0f03f1a, 0xb2eb2807, 0xbce2250c, 0xe6956e65, 0xe89c636e, 0xfa877473, 0xf48e7978, 0xdeb15a49, 0xd0b85742, 0xc2a3405f, 0xccaa4d54, 0x41ecdaf7, 0x4fe5d7fc, 0x5dfec0e1, 0x53f7cdea, 0x79c8eedb, 0x77c1e3d0, 0x65daf4cd, 0x6bd3f9c6, 0x31a4b2af, 0x3fadbfa4, 0x2db6a8b9, 0x23bfa5b2, 0x09808683, 0x07898b88, 0x15929c95, 0x1b9b919e, 0xa17c0a47, 0xaf75074c, 0xbd6e1051, 0xb3671d5a, 0x99583e6b, 0x97513360, 0x854a247d, 0x8b432976, 0xd134621f, 0xdf3d6f14, 0xcd267809, 0xc32f7502, 0xe9105633, 0xe7195b38, 0xf5024c25, 0xfb0b412e, 0x9ad7618c, 0x94de6c87, 0x86c57b9a, 0x88cc7691, 0xa2f355a0, 0xacfa58ab, 0xbee14fb6, 0xb0e842bd, 0xea9f09d4, 0xe49604df, 0xf68d13c2, 0xf8841ec9, 0xd2bb3df8, 0xdcb230f3, 0xcea927ee, 0xc0a02ae5, 0x7a47b13c, 0x744ebc37, 0x6655ab2a, 0x685ca621, 0x42638510, 0x4c6a881b, 0x5e719f06, 0x5078920d, 0x0a0fd964, 0x0406d46f, 0x161dc372, 0x1814ce79, 0x322bed48, 0x3c22e043, 0x2e39f75e, 0x2030fa55, 0xec9ab701, 0xe293ba0a, 0xf088ad17, 0xfe81a01c, 0xd4be832d, 0xdab78e26, 0xc8ac993b, 0xc6a59430, 0x9cd2df59, 0x92dbd252, 0x80c0c54f, 0x8ec9c844, 0xa4f6eb75, 0xaaffe67e, 0xb8e4f163, 0xb6edfc68, 0x0c0a67b1, 0x02036aba, 0x10187da7, 0x1e1170ac, 0x342e539d, 0x3a275e96, 0x283c498b, 0x26354480, 0x7c420fe9, 0x724b02e2, 0x605015ff, 0x6e5918f4, 0x44663bc5, 0x4a6f36ce, 0x587421d3, 0x567d2cd8, 0x37a10c7a, 0x39a80171, 0x2bb3166c, 0x25ba1b67, 0x0f853856, 0x018c355d, 0x13972240, 0x1d9e2f4b, 0x47e96422, 0x49e06929, 0x5bfb7e34, 0x55f2733f, 0x7fcd500e, 0x71c45d05, 0x63df4a18, 0x6dd64713, 0xd731dcca, 0xd938d1c1, 0xcb23c6dc, 0xc52acbd7, 0xef15e8e6, 0xe11ce5ed, 0xf307f2f0, 0xfd0efffb, 0xa779b492, 0xa970b999, 0xbb6bae84, 0xb562a38f, 0x9f5d80be, 0x91548db5, 0x834f9aa8, 0x8d4697a3];
						var U2 = [0x00000000, 0x0b0e090d, 0x161c121a, 0x1d121b17, 0x2c382434, 0x27362d39, 0x3a24362e, 0x312a3f23, 0x58704868, 0x537e4165, 0x4e6c5a72, 0x4562537f, 0x74486c5c, 0x7f466551, 0x62547e46, 0x695a774b, 0xb0e090d0, 0xbbee99dd, 0xa6fc82ca, 0xadf28bc7, 0x9cd8b4e4, 0x97d6bde9, 0x8ac4a6fe, 0x81caaff3, 0xe890d8b8, 0xe39ed1b5, 0xfe8ccaa2, 0xf582c3af, 0xc4a8fc8c, 0xcfa6f581, 0xd2b4ee96, 0xd9bae79b, 0x7bdb3bbb, 0x70d532b6, 0x6dc729a1, 0x66c920ac, 0x57e31f8f, 0x5ced1682, 0x41ff0d95, 0x4af10498, 0x23ab73d3, 0x28a57ade, 0x35b761c9, 0x3eb968c4, 0x0f9357e7, 0x049d5eea, 0x198f45fd, 0x12814cf0, 0xcb3bab6b, 0xc035a266, 0xdd27b971, 0xd629b07c, 0xe7038f5f, 0xec0d8652, 0xf11f9d45, 0xfa119448, 0x934be303, 0x9845ea0e, 0x8557f119, 0x8e59f814, 0xbf73c737, 0xb47dce3a, 0xa96fd52d, 0xa261dc20, 0xf6ad766d, 0xfda37f60, 0xe0b16477, 0xebbf6d7a, 0xda955259, 0xd19b5b54, 0xcc894043, 0xc787494e, 0xaedd3e05, 0xa5d33708, 0xb8c12c1f, 0xb3cf2512, 0x82e51a31, 0x89eb133c, 0x94f9082b, 0x9ff70126, 0x464de6bd, 0x4d43efb0, 0x5051f4a7, 0x5b5ffdaa, 0x6a75c289, 0x617bcb84, 0x7c69d093, 0x7767d99e, 0x1e3daed5, 0x1533a7d8, 0x0821bccf, 0x032fb5c2, 0x32058ae1, 0x390b83ec, 0x241998fb, 0x2f1791f6, 0x8d764dd6, 0x867844db, 0x9b6a5fcc, 0x906456c1, 0xa14e69e2, 0xaa4060ef, 0xb7527bf8, 0xbc5c72f5, 0xd50605be, 0xde080cb3, 0xc31a17a4, 0xc8141ea9, 0xf93e218a, 0xf2302887, 0xef223390, 0xe42c3a9d, 0x3d96dd06, 0x3698d40b, 0x2b8acf1c, 0x2084c611, 0x11aef932, 0x1aa0f03f, 0x07b2eb28, 0x0cbce225, 0x65e6956e, 0x6ee89c63, 0x73fa8774, 0x78f48e79, 0x49deb15a, 0x42d0b857, 0x5fc2a340, 0x54ccaa4d, 0xf741ecda, 0xfc4fe5d7, 0xe15dfec0, 0xea53f7cd, 0xdb79c8ee, 0xd077c1e3, 0xcd65daf4, 0xc66bd3f9, 0xaf31a4b2, 0xa43fadbf, 0xb92db6a8, 0xb223bfa5, 0x83098086, 0x8807898b, 0x9515929c, 0x9e1b9b91, 0x47a17c0a, 0x4caf7507, 0x51bd6e10, 0x5ab3671d, 0x6b99583e, 0x60975133, 0x7d854a24, 0x768b4329, 0x1fd13462, 0x14df3d6f, 0x09cd2678, 0x02c32f75, 0x33e91056, 0x38e7195b, 0x25f5024c, 0x2efb0b41, 0x8c9ad761, 0x8794de6c, 0x9a86c57b, 0x9188cc76, 0xa0a2f355, 0xabacfa58, 0xb6bee14f, 0xbdb0e842, 0xd4ea9f09, 0xdfe49604, 0xc2f68d13, 0xc9f8841e, 0xf8d2bb3d, 0xf3dcb230, 0xeecea927, 0xe5c0a02a, 0x3c7a47b1, 0x37744ebc, 0x2a6655ab, 0x21685ca6, 0x10426385, 0x1b4c6a88, 0x065e719f, 0x0d507892, 0x640a0fd9, 0x6f0406d4, 0x72161dc3, 0x791814ce, 0x48322bed, 0x433c22e0, 0x5e2e39f7, 0x552030fa, 0x01ec9ab7, 0x0ae293ba, 0x17f088ad, 0x1cfe81a0, 0x2dd4be83, 0x26dab78e, 0x3bc8ac99, 0x30c6a594, 0x599cd2df, 0x5292dbd2, 0x4f80c0c5, 0x448ec9c8, 0x75a4f6eb, 0x7eaaffe6, 0x63b8e4f1, 0x68b6edfc, 0xb10c0a67, 0xba02036a, 0xa710187d, 0xac1e1170, 0x9d342e53, 0x963a275e, 0x8b283c49, 0x80263544, 0xe97c420f, 0xe2724b02, 0xff605015, 0xf46e5918, 0xc544663b, 0xce4a6f36, 0xd3587421, 0xd8567d2c, 0x7a37a10c, 0x7139a801, 0x6c2bb316, 0x6725ba1b, 0x560f8538, 0x5d018c35, 0x40139722, 0x4b1d9e2f, 0x2247e964, 0x2949e069, 0x345bfb7e, 0x3f55f273, 0x0e7fcd50, 0x0571c45d, 0x1863df4a, 0x136dd647, 0xcad731dc, 0xc1d938d1, 0xdccb23c6, 0xd7c52acb, 0xe6ef15e8, 0xede11ce5, 0xf0f307f2, 0xfbfd0eff, 0x92a779b4, 0x99a970b9, 0x84bb6bae, 0x8fb562a3, 0xbe9f5d80, 0xb591548d, 0xa8834f9a, 0xa38d4697];
						var U3 = [0x00000000, 0x0d0b0e09, 0x1a161c12, 0x171d121b, 0x342c3824, 0x3927362d, 0x2e3a2436, 0x23312a3f, 0x68587048, 0x65537e41, 0x724e6c5a, 0x7f456253, 0x5c74486c, 0x517f4665, 0x4662547e, 0x4b695a77, 0xd0b0e090, 0xddbbee99, 0xcaa6fc82, 0xc7adf28b, 0xe49cd8b4, 0xe997d6bd, 0xfe8ac4a6, 0xf381caaf, 0xb8e890d8, 0xb5e39ed1, 0xa2fe8cca, 0xaff582c3, 0x8cc4a8fc, 0x81cfa6f5, 0x96d2b4ee, 0x9bd9bae7, 0xbb7bdb3b, 0xb670d532, 0xa16dc729, 0xac66c920, 0x8f57e31f, 0x825ced16, 0x9541ff0d, 0x984af104, 0xd323ab73, 0xde28a57a, 0xc935b761, 0xc43eb968, 0xe70f9357, 0xea049d5e, 0xfd198f45, 0xf012814c, 0x6bcb3bab, 0x66c035a2, 0x71dd27b9, 0x7cd629b0, 0x5fe7038f, 0x52ec0d86, 0x45f11f9d, 0x48fa1194, 0x03934be3, 0x0e9845ea, 0x198557f1, 0x148e59f8, 0x37bf73c7, 0x3ab47dce, 0x2da96fd5, 0x20a261dc, 0x6df6ad76, 0x60fda37f, 0x77e0b164, 0x7aebbf6d, 0x59da9552, 0x54d19b5b, 0x43cc8940, 0x4ec78749, 0x05aedd3e, 0x08a5d337, 0x1fb8c12c, 0x12b3cf25, 0x3182e51a, 0x3c89eb13, 0x2b94f908, 0x269ff701, 0xbd464de6, 0xb04d43ef, 0xa75051f4, 0xaa5b5ffd, 0x896a75c2, 0x84617bcb, 0x937c69d0, 0x9e7767d9, 0xd51e3dae, 0xd81533a7, 0xcf0821bc, 0xc2032fb5, 0xe132058a, 0xec390b83, 0xfb241998, 0xf62f1791, 0xd68d764d, 0xdb867844, 0xcc9b6a5f, 0xc1906456, 0xe2a14e69, 0xefaa4060, 0xf8b7527b, 0xf5bc5c72, 0xbed50605, 0xb3de080c, 0xa4c31a17, 0xa9c8141e, 0x8af93e21, 0x87f23028, 0x90ef2233, 0x9de42c3a, 0x063d96dd, 0x0b3698d4, 0x1c2b8acf, 0x112084c6, 0x3211aef9, 0x3f1aa0f0, 0x2807b2eb, 0x250cbce2, 0x6e65e695, 0x636ee89c, 0x7473fa87, 0x7978f48e, 0x5a49deb1, 0x5742d0b8, 0x405fc2a3, 0x4d54ccaa, 0xdaf741ec, 0xd7fc4fe5, 0xc0e15dfe, 0xcdea53f7, 0xeedb79c8, 0xe3d077c1, 0xf4cd65da, 0xf9c66bd3, 0xb2af31a4, 0xbfa43fad, 0xa8b92db6, 0xa5b223bf, 0x86830980, 0x8b880789, 0x9c951592, 0x919e1b9b, 0x0a47a17c, 0x074caf75, 0x1051bd6e, 0x1d5ab367, 0x3e6b9958, 0x33609751, 0x247d854a, 0x29768b43, 0x621fd134, 0x6f14df3d, 0x7809cd26, 0x7502c32f, 0x5633e910, 0x5b38e719, 0x4c25f502, 0x412efb0b, 0x618c9ad7, 0x6c8794de, 0x7b9a86c5, 0x769188cc, 0x55a0a2f3, 0x58abacfa, 0x4fb6bee1, 0x42bdb0e8, 0x09d4ea9f, 0x04dfe496, 0x13c2f68d, 0x1ec9f884, 0x3df8d2bb, 0x30f3dcb2, 0x27eecea9, 0x2ae5c0a0, 0xb13c7a47, 0xbc37744e, 0xab2a6655, 0xa621685c, 0x85104263, 0x881b4c6a, 0x9f065e71, 0x920d5078, 0xd9640a0f, 0xd46f0406, 0xc372161d, 0xce791814, 0xed48322b, 0xe0433c22, 0xf75e2e39, 0xfa552030, 0xb701ec9a, 0xba0ae293, 0xad17f088, 0xa01cfe81, 0x832dd4be, 0x8e26dab7, 0x993bc8ac, 0x9430c6a5, 0xdf599cd2, 0xd25292db, 0xc54f80c0, 0xc8448ec9, 0xeb75a4f6, 0xe67eaaff, 0xf163b8e4, 0xfc68b6ed, 0x67b10c0a, 0x6aba0203, 0x7da71018, 0x70ac1e11, 0x539d342e, 0x5e963a27, 0x498b283c, 0x44802635, 0x0fe97c42, 0x02e2724b, 0x15ff6050, 0x18f46e59, 0x3bc54466, 0x36ce4a6f, 0x21d35874, 0x2cd8567d, 0x0c7a37a1, 0x017139a8, 0x166c2bb3, 0x1b6725ba, 0x38560f85, 0x355d018c, 0x22401397, 0x2f4b1d9e, 0x642247e9, 0x692949e0, 0x7e345bfb, 0x733f55f2, 0x500e7fcd, 0x5d0571c4, 0x4a1863df, 0x47136dd6, 0xdccad731, 0xd1c1d938, 0xc6dccb23, 0xcbd7c52a, 0xe8e6ef15, 0xe5ede11c, 0xf2f0f307, 0xfffbfd0e, 0xb492a779, 0xb999a970, 0xae84bb6b, 0xa38fb562, 0x80be9f5d, 0x8db59154, 0x9aa8834f, 0x97a38d46];
						var U4 = [0x00000000, 0x090d0b0e, 0x121a161c, 0x1b171d12, 0x24342c38, 0x2d392736, 0x362e3a24, 0x3f23312a, 0x48685870, 0x4165537e, 0x5a724e6c, 0x537f4562, 0x6c5c7448, 0x65517f46, 0x7e466254, 0x774b695a, 0x90d0b0e0, 0x99ddbbee, 0x82caa6fc, 0x8bc7adf2, 0xb4e49cd8, 0xbde997d6, 0xa6fe8ac4, 0xaff381ca, 0xd8b8e890, 0xd1b5e39e, 0xcaa2fe8c, 0xc3aff582, 0xfc8cc4a8, 0xf581cfa6, 0xee96d2b4, 0xe79bd9ba, 0x3bbb7bdb, 0x32b670d5, 0x29a16dc7, 0x20ac66c9, 0x1f8f57e3, 0x16825ced, 0x0d9541ff, 0x04984af1, 0x73d323ab, 0x7ade28a5, 0x61c935b7, 0x68c43eb9, 0x57e70f93, 0x5eea049d, 0x45fd198f, 0x4cf01281, 0xab6bcb3b, 0xa266c035, 0xb971dd27, 0xb07cd629, 0x8f5fe703, 0x8652ec0d, 0x9d45f11f, 0x9448fa11, 0xe303934b, 0xea0e9845, 0xf1198557, 0xf8148e59, 0xc737bf73, 0xce3ab47d, 0xd52da96f, 0xdc20a261, 0x766df6ad, 0x7f60fda3, 0x6477e0b1, 0x6d7aebbf, 0x5259da95, 0x5b54d19b, 0x4043cc89, 0x494ec787, 0x3e05aedd, 0x3708a5d3, 0x2c1fb8c1, 0x2512b3cf, 0x1a3182e5, 0x133c89eb, 0x082b94f9, 0x01269ff7, 0xe6bd464d, 0xefb04d43, 0xf4a75051, 0xfdaa5b5f, 0xc2896a75, 0xcb84617b, 0xd0937c69, 0xd99e7767, 0xaed51e3d, 0xa7d81533, 0xbccf0821, 0xb5c2032f, 0x8ae13205, 0x83ec390b, 0x98fb2419, 0x91f62f17, 0x4dd68d76, 0x44db8678, 0x5fcc9b6a, 0x56c19064, 0x69e2a14e, 0x60efaa40, 0x7bf8b752, 0x72f5bc5c, 0x05bed506, 0x0cb3de08, 0x17a4c31a, 0x1ea9c814, 0x218af93e, 0x2887f230, 0x3390ef22, 0x3a9de42c, 0xdd063d96, 0xd40b3698, 0xcf1c2b8a, 0xc6112084, 0xf93211ae, 0xf03f1aa0, 0xeb2807b2, 0xe2250cbc, 0x956e65e6, 0x9c636ee8, 0x877473fa, 0x8e7978f4, 0xb15a49de, 0xb85742d0, 0xa3405fc2, 0xaa4d54cc, 0xecdaf741, 0xe5d7fc4f, 0xfec0e15d, 0xf7cdea53, 0xc8eedb79, 0xc1e3d077, 0xdaf4cd65, 0xd3f9c66b, 0xa4b2af31, 0xadbfa43f, 0xb6a8b92d, 0xbfa5b223, 0x80868309, 0x898b8807, 0x929c9515, 0x9b919e1b, 0x7c0a47a1, 0x75074caf, 0x6e1051bd, 0x671d5ab3, 0x583e6b99, 0x51336097, 0x4a247d85, 0x4329768b, 0x34621fd1, 0x3d6f14df, 0x267809cd, 0x2f7502c3, 0x105633e9, 0x195b38e7, 0x024c25f5, 0x0b412efb, 0xd7618c9a, 0xde6c8794, 0xc57b9a86, 0xcc769188, 0xf355a0a2, 0xfa58abac, 0xe14fb6be, 0xe842bdb0, 0x9f09d4ea, 0x9604dfe4, 0x8d13c2f6, 0x841ec9f8, 0xbb3df8d2, 0xb230f3dc, 0xa927eece, 0xa02ae5c0, 0x47b13c7a, 0x4ebc3774, 0x55ab2a66, 0x5ca62168, 0x63851042, 0x6a881b4c, 0x719f065e, 0x78920d50, 0x0fd9640a, 0x06d46f04, 0x1dc37216, 0x14ce7918, 0x2bed4832, 0x22e0433c, 0x39f75e2e, 0x30fa5520, 0x9ab701ec, 0x93ba0ae2, 0x88ad17f0, 0x81a01cfe, 0xbe832dd4, 0xb78e26da, 0xac993bc8, 0xa59430c6, 0xd2df599c, 0xdbd25292, 0xc0c54f80, 0xc9c8448e, 0xf6eb75a4, 0xffe67eaa, 0xe4f163b8, 0xedfc68b6, 0x0a67b10c, 0x036aba02, 0x187da710, 0x1170ac1e, 0x2e539d34, 0x275e963a, 0x3c498b28, 0x35448026, 0x420fe97c, 0x4b02e272, 0x5015ff60, 0x5918f46e, 0x663bc544, 0x6f36ce4a, 0x7421d358, 0x7d2cd856, 0xa10c7a37, 0xa8017139, 0xb3166c2b, 0xba1b6725, 0x8538560f, 0x8c355d01, 0x97224013, 0x9e2f4b1d, 0xe9642247, 0xe0692949, 0xfb7e345b, 0xf2733f55, 0xcd500e7f, 0xc45d0571, 0xdf4a1863, 0xd647136d, 0x31dccad7, 0x38d1c1d9, 0x23c6dccb, 0x2acbd7c5, 0x15e8e6ef, 0x1ce5ede1, 0x07f2f0f3, 0x0efffbfd, 0x79b492a7, 0x70b999a9, 0x6bae84bb, 0x62a38fb5, 0x5d80be9f, 0x548db591, 0x4f9aa883, 0x4697a38d];

						function convertToInt32(bytes) {
							var result = [];
							for (var i = 0; i < bytes.length; i += 4) {
								result.push(
									(bytes[i    ] << 24) |
									(bytes[i + 1] << 16) |
									(bytes[i + 2] <<  8) |
									 bytes[i + 3]
								);
							}
							return result;
						}

						var AES = function(key) {
							if (!(this instanceof AES)) {
								throw Error('AES must be instanitated with `new`');
							}

							Object.defineProperty(this, 'key', {
								value: coerceArray(key, true)
							});

							this._prepare();
						}


						AES.prototype._prepare = function() {

							var rounds = numberOfRounds[this.key.length];
							if (rounds == null) {
								throw new Error('invalid key size (must be 16, 24 or 32 bytes)');
							}

							// encryption round keys
							this._Ke = [];

							// decryption round keys
							this._Kd = [];

							for (var i = 0; i <= rounds; i++) {
								this._Ke.push([0, 0, 0, 0]);
								this._Kd.push([0, 0, 0, 0]);
							}

							var roundKeyCount = (rounds + 1) * 4;
							var KC = this.key.length / 4;

							// convert the key into ints
							var tk = convertToInt32(this.key);

							// copy values into round key arrays
							var index;
							for (var i = 0; i < KC; i++) {
								index = i >> 2;
								this._Ke[index][i % 4] = tk[i];
								this._Kd[rounds - index][i % 4] = tk[i];
							}

							// key expansion (fips-197 section 5.2)
							var rconpointer = 0;
							var t = KC, tt;
							while (t < roundKeyCount) {
								tt = tk[KC - 1];
								tk[0] ^= ((S[(tt >> 16) & 0xFF] << 24) ^
										  (S[(tt >>  8) & 0xFF] << 16) ^
										  (S[ tt        & 0xFF] <<  8) ^
										   S[(tt >> 24) & 0xFF]        ^
										  (rcon[rconpointer] << 24));
								rconpointer += 1;

								// key expansion (for non-256 bit)
								if (KC != 8) {
									for (var i = 1; i < KC; i++) {
										tk[i] ^= tk[i - 1];
									}

								// key expansion for 256-bit keys is "slightly different" (fips-197)
								} else {
									for (var i = 1; i < (KC / 2); i++) {
										tk[i] ^= tk[i - 1];
									}
									tt = tk[(KC / 2) - 1];

									tk[KC / 2] ^= (S[ tt        & 0xFF]        ^
												  (S[(tt >>  8) & 0xFF] <<  8) ^
												  (S[(tt >> 16) & 0xFF] << 16) ^
												  (S[(tt >> 24) & 0xFF] << 24));

									for (var i = (KC / 2) + 1; i < KC; i++) {
										tk[i] ^= tk[i - 1];
									}
								}

								// copy values into round key arrays
								var i = 0, r, c;
								while (i < KC && t < roundKeyCount) {
									r = t >> 2;
									c = t % 4;
									this._Ke[r][c] = tk[i];
									this._Kd[rounds - r][c] = tk[i++];
									t++;
								}
							}

							// inverse-cipher-ify the decryption round key (fips-197 section 5.3)
							for (var r = 1; r < rounds; r++) {
								for (var c = 0; c < 4; c++) {
									tt = this._Kd[r][c];
									this._Kd[r][c] = (U1[(tt >> 24) & 0xFF] ^
													  U2[(tt >> 16) & 0xFF] ^
													  U3[(tt >>  8) & 0xFF] ^
													  U4[ tt        & 0xFF]);
								}
							}
						}

						AES.prototype.decrypt = function(ciphertext) {
							if (ciphertext.length != 16) {
								throw new Error('invalid ciphertext size (must be 16 bytes)');
							}

							var rounds = this._Kd.length - 1;
							var a = [0, 0, 0, 0];

							// convert plaintext to (ints ^ key)
							var t = convertToInt32(ciphertext);
							for (var i = 0; i < 4; i++) {
								t[i] ^= this._Kd[0][i];
							}

							// apply round transforms
							for (var r = 1; r < rounds; r++) {
								for (var i = 0; i < 4; i++) {
									a[i] = (T5[(t[ i          ] >> 24) & 0xff] ^
											T6[(t[(i + 3) % 4] >> 16) & 0xff] ^
											T7[(t[(i + 2) % 4] >>  8) & 0xff] ^
											T8[ t[(i + 1) % 4]        & 0xff] ^
											this._Kd[r][i]);
								}
								t = a.slice();
							}

							// the last round is special
							var result = createArray(16), tt;
							for (var i = 0; i < 4; i++) {
								tt = this._Kd[rounds][i];
								result[4 * i    ] = (Si[(t[ i         ] >> 24) & 0xff] ^ (tt >> 24)) & 0xff;
								result[4 * i + 1] = (Si[(t[(i + 3) % 4] >> 16) & 0xff] ^ (tt >> 16)) & 0xff;
								result[4 * i + 2] = (Si[(t[(i + 2) % 4] >>  8) & 0xff] ^ (tt >>  8)) & 0xff;
								result[4 * i + 3] = (Si[ t[(i + 1) % 4]        & 0xff] ^  tt       ) & 0xff;
							}

							return result;
						}

						/**
						 *  Mode Of Operation - Cipher Block Chaining (CBC)
						 */
						var ModeOfOperationCBC = function(key, iv) {
							if (!(this instanceof ModeOfOperationCBC)) {
								throw Error('AES must be instanitated with `new`');
							}

							this.description = "Cipher Block Chaining";
							this.name = "cbc";

							if (!iv) {
								iv = createArray(16);

							} else if (iv.length != 16) {
								throw new Error('invalid initialation vector size (must be 16 bytes)');
							}

							this._lastCipherblock = coerceArray(iv, true);

							this._aes = new AES(key);
						}

						ModeOfOperationCBC.prototype.decrypt = function(ciphertext) {
							ciphertext = coerceArray(ciphertext);

							if ((ciphertext.length % 16) !== 0) {
								throw new Error('invalid ciphertext size (must be multiple of 16 bytes)');
							}

							var plaintext = createArray(ciphertext.length);
							var block = createArray(16);

							for (var i = 0; i < ciphertext.length; i += 16) {
								copyArray(ciphertext, block, 0, i, i + 16);
								block = this._aes.decrypt(block);

								for (var j = 0; j < 16; j++) {
									plaintext[i + j] = block[j] ^ this._lastCipherblock[j];
								}

								copyArray(ciphertext, this._lastCipherblock, 0, i, i + 16);
							}

							return plaintext;
						}

						// The block cipher
						return {
							AES: AES,

							ModeOfOperation: {
								cbc: ModeOfOperationCBC
							}
						};
					})();

		this.ConvertURL = function(url, options)
		{
			this.data = url;
			this.dataKey = 'url';
			this.options = this._cleanOptions(options);
			this.post = false;

			return this;
		};

		this.ConvertHTML = function(html, options)
		{
			this.data = encodeURIComponent(html);
			this.dataKey = 'html';
			this.options = this._cleanOptions(options);
			this.post = true;

			return this;
		};
		
		this.ConvertPage = function(options)
		{
			if (options == null)
			{
				options = {};
			}
			
			options['address'] = window.location.href;
			
			var div = document.createElement('div');
			div.appendChild(document.documentElement.cloneNode(true));
			var inputs = div.getElementsByTagName('input');
			if (inputs != null)
			{
				for (var i = 0; i < inputs.length; i++) {
					if (typeof(inputs[i].checked) !== 'undefined')
					{
						if (inputs[i].checked){
							inputs[i].setAttribute('checked', 'true');
						}
						else{
							inputs[i].removeAttribute('checked');
						}
					}
					inputs[i].setAttribute('value', inputs[i].value);
				}
			}
			var textareas = div.getElementsByTagName('textarea');
			if (textareas != null)
			{
				for (var i = 0; i < textareas.length; i++) {
					textareas[i].innerHTML = textareas[i].value;
				}
			}		
			
			var currentSelects = document.getElementsByTagName('select');
			var selects = div.getElementsByTagName('select');
			if (selects != null)
			{
				for (var i = 0; i < selects.length; i++) {
					if (selects[i].options != null)
					{
						selects[i].innerHTML = "";
						for (var j = 0; j < currentSelects[i].options.length; j++) {
							var option = document.createElement("option");							
							if(currentSelects[i].options[j].selected){
								option.setAttribute('selected', 'selected');
							}
							option.setAttribute('value', currentSelects[i].options[j].value);
							option.innerHTML = currentSelects[i].options[j].innerHTML;
							selects[i].add(option);
						}
					}
				}
			}
			
			return this.ConvertHTML(div.innerHTML, options);
		};		

		this.UseSSL = function()
		{
			this.protocol = 'https://';

			return this;
		};
		
		this.AddPostVariable = function(name, value)
		{
			if (this.postVars != '')
			{
				this.postVars += '&';
			}
			
			this.postVars += encodeURIComponent(name)+ '=' + encodeURIComponent(value);

			return this;
		};		

		this.AddTemplateVariable = function(name, value)
		{
			if (this.tVars != '')
			{
				this.tVars += '&';
			}
			
			this.tVars += encodeURIComponent(name)+ '=' + encodeURIComponent(value);

			return this;
		};		
		
		this.Encrypt = function()
		{
			this.encrypt = true;

			return this;
		};

		this._cleanOptions = function(opts)
		{
			if (opts == null)
			{
				return {};
			}

			var results = {};

			for(var k in opts)
			{
				if (k == null)
				{
					continue;
				}

				results[k.toLowerCase()] = opts[k];
			}
			
			if (results['target'] != null)
			{
				results['target'] = results['target'].replace('#','');
			}
			
			if (typeof(results['onfinish']) === 'function'){
				var functionName = 'grabzItOnFinish' + Math.floor(Math.random() * (1000000000+1));
				window[functionName] = results['onfinish'];
				results['onfinish'] = functionName;
			}
			
			if (typeof(results['onerror']) === 'function'){
				var functionName = 'grabzItOnError' + Math.floor(Math.random() * (1000000000+1));
				window[functionName] = results['onerror'];
				results['onerror'] = functionName;
			}

			return results;
		}

		this._createXHTTP = function()
		{
			if (window.XMLHttpRequest)
			{
				return new XMLHttpRequest();
			}
			return new ActiveXObject("Microsoft.XMLHTTP");
		};

		this._post = function(qs)
		{
			var xhttp = this._createXHTTP();

			var that = this;

			xhttp.onreadystatechange = function()
			{
				if (this.readyState == 4 && this.status == 200)
				{
					if (!that.retried && !this.responseText)
					{
						that.retried = true;
						that._post(qs);
						return;
					}
					that.elem.appendChild(that._handlePost(JSON.parse(this.responseText)));
				}
			};

			xhttp.open("POST", this._getBaseWebServiceUrl(), true);
			xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xhttp.send(qs);
		};

		this._getRootURL = function()
		{
			if (this.protocol == null)
			{
				this.protocol = '//';
				if (window.location.protocol != 'https:' && window.location.protocol != 'http:')
				{
					this.protocol = 'http://';
				}
			}

			return this.protocol + 'api.grabz.it/services/';
		};

		this._getBaseWebServiceUrl = function()
		{
			return this._getRootURL() + 'javascript.ashx';
		};

		this._createQueryString = function(sKey, sValue)
		{
			var qs = 'key='+encodeURIComponent(this.key)+'&'+sKey+'=' + encodeURIComponent(sValue);

			if (this.encrypt && !this.options['encryption'])
			{
				var randomArray = new Uint8Array(32);
				window.crypto.getRandomValues(randomArray);
				this.options['encryption'] = btoa(String.fromCharCode.apply(null, randomArray));
			}
			
			if (this.postVars != '' && !this.options['post'])
			{
				this.options['post'] = this.postVars;
			}

			if (this.tVars != '' && !this.options['tvars'])
			{
				this.options['tvars'] = this.tVars;
			}
			
			for(var k in this.options)
			{
				if (k != 'format' && k != 'cache' && k != 'customwatermarkid' && k != 'quality'
				&& k != 'country' && k != 'filename' && k != 'errorid' && k != 'errorclass' &&
				k != 'onfinish' && k != 'onerror' && k != 'delay' && k != 'bwidth' && k != 'bheight' &&
				k != 'height' && k != 'width' && k != 'target' && k != 'requestas' && k != 'download' && k != 'suppresserrors' && k != 'displayid' && k != 'displayclass' && k != 'background' && k != 'pagesize' && k != 'orientation' && k != 'includelinks' && k != 'includeoutline' && k != 'title' && k != 'coverurl' && k != 'mtop' && k != 'mleft' && k != 'mbottom' && k != 'mright' && k != 'tabletoinclude' && k != 'includeheadernames' && k != 'includealltables' && k != 'start' && k != 'duration' && k != 'speed' && k != 'fps' && k != 'repeat' && k != 'reverse' &&
				k != 'templateid' && k != 'noresult' && k != 'hide' && k != 'includeimages' && k != 'export' && k != 'waitfor' && k != 'transparent' &&
				k != 'encryption' && k != 'post' && k != 'noads' && k != 'tvars' && k != 'proxy' && k != 'mergeid' && k != 'address' && k != 'nonotify' && k != 'cachelength')
				{
					var error = "Option " + k + " not recognized!";
					document.documentElement.appendChild(this._createErrorMessage(error, null));
					throw error;
				}

				var v = this.options[k];
				if (v != null)
                {
					qs += '&' + k + '=' + encodeURIComponent(v);
				}
			}

			return qs;
		};

		this._createScriptNode = function(sUrl)
		{
			var scriptNode = document.createElement('script');
			scriptNode.src = sUrl;

			return scriptNode;
		};

		this._handlePost = function(obj)
		{
			if (obj != null)
			{
				if (obj.ID == null || obj.ID == '')
				{					
					return this._createErrorMessage(obj.Message, obj.Code);
				}
				return this._createScriptNode(this._getBaseWebServiceUrl() + '?' + this._createQueryString('id', obj.ID));
			}
		};
		
		this._createErrorMessage = function(error, code){
			var message = document.createElement('span');
			message.innerHTML = '<strong>GrabzIt Error:</strong> ' + error;
			if (this.options['errorid'] != null)
			{
				message.setAttribute('id', this.options['errorid']);
			}
			if (this.options['errorclass'] != null)
			{
				message.setAttribute('class', this.options['errorclass']);
			}	
			if (this.options['errorid'] == null && this.options['errorclass'] == null)
			{
				message.setAttribute('style', 'position:fixed !important;top:2% !important;left:50% !important;border:1px solid #FF0000 !important;background-color:#FFF !important;color:#FF0000 !important;padding:0.5em !important;transform: translateX(-50%) !important;z-index:1000000 !important');
			}						
			
			if (this.options['onerror'] != null)
			{
				window[this.options['onerror']](error, code);
			}			
			
			return message;
		}

		this._base64ToBytes = function(base64)
		{
			var byteCharacters = atob(base64);
			var byteNumbers = new Array(byteCharacters.length);
			for (var i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i);
			}
			return new Uint8Array(byteNumbers);
		};

		this._bytesToBase64 = function(bytes)
		{
			var binary = '';
			var len = bytes.byteLength;
			for (var i = 0; i < len; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			return btoa(binary);
		};

		this.DataURI = function(callback, decrypt)
		{
			var onFinishName = null;
			if (this.options['onfinish'] != null)
			{
				onFinishName = this.options['onfinish'];
			}

			var functionName = 'grabzItCallback' + Math.floor(Math.random() * (1000000000+1));

			this.options['onfinish'] = functionName;
			this.options['noresult'] = 1;

			var that = this;
			window[functionName] = function (id)
			{
				var xhttp = that._createXHTTP();

				xhttp.onreadystatechange = function()
				{
					if (this.readyState == 4 && this.status == 200)
					{
					    var reader = new FileReader();
					    reader.onload = function(event)
					    {
							var result = event.target.result;
							if (decrypt && that.options['encryption'] && result != null)
							{
								//automatically decrypt the image
								var mimeIndex = result.indexOf("base64,") + 7;
								var mime = result.substring(0, mimeIndex);
								var base64Data = result.substring(mimeIndex);
								var byteData = that._base64ToBytes(base64Data);
								var iv = byteData.slice(0,16);
								var payload = byteData.slice(16);
								var aesCbc = new that.aesjs.ModeOfOperation.cbc(that._base64ToBytes(that.options['encryption']), iv);
								result = mime + that._bytesToBase64(aesCbc.decrypt(payload));
							}
					    	if (callback != null)
					    	{
					    		callback(result);
					    	}
					    	if (onFinishName != null)
					    	{
					    		var finishFunc = new Function(onFinishName + "('" + id + "')");
					    		finishFunc();
					    	}
					    }
					    reader.readAsDataURL(this.response);
					}
				};

				xhttp.open("GET", that._getRootURL() + 'getjspicture.ashx?id='+id, true);
				xhttp.responseType = "blob";
				xhttp.send();
			}

			this.Create();
		};

		this.Create = function()
		{
			var defaultNode = document.documentElement;
			if (document.body != null)
			{
				defaultNode = document.body;
			}
			this.AddTo(defaultNode, true);
		};
		
		this.CreateInvisible = function(){
			this.options['noresult'] = 1;
			this.Create();
		};

		this.AddTo = function(container, insert)
		{
			if (typeof container == 'string' || container instanceof String)
			{
				this.elem = document.getElementById(container);
				if (this.elem == null)
				{
					throw "An element with the id " + container + " was not found";
				}
			}
			else if (container.nodeType === 1)
			{
				this.elem = container;
			}

			if (this.elem == null)
			{
				throw "No valid element was provided to attach the capture to";
			}

			if (this.options['download'] != '1')
			{
				delete this.options['download'];
			}

			if (this.post)
			{
				this._post(this._createQueryString(this.dataKey, this.data));
				return;
			}

			var scriptNode = this._createScriptNode(this._getBaseWebServiceUrl() + '?' + this._createQueryString(this.dataKey, this.data));
			
			if (insert)
			{
				try
				{
					this.elem.insertBefore(scriptNode, this.elem.firstChild);
					return;
				}
				catch(e){}
			}
			
			this.elem.appendChild(scriptNode);
		};
	})(key);
}

function GrabzItPreviewFinished(id)
{
	var obj = document.getElementById("grabzit-screenshot-result");

	if (obj != null)
	{
		obj.removeAttribute("id");
		var children = obj.parentNode.parentNode.childNodes;

		for (var j = 0; j < children.length; j++)
		{
			if (children[j].className == "grabzit-preview-loader")
			{
				children[j].style.display = "none";
			}
			if (children[j].className == "grabzit-preview-screenshot-frame")
			{
				children[j].style.display = "block";
			}
		}
	}
}

function GrabzItPreview(key, options)
{
	this._guid = function()
	{
    	return this._s4() + this._s4() + '-' + this._s4() + '-' + this._s4() + '-' + this._s4() + '-' + this._s4() + this._s4() + this._s4();
	}

	this._s4 = function()
	{
    	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}

	this._getJSFunction = function(jsAttribute)
	{
		if (jsAttribute != null)
		{
			return jsAttribute + ";";
		}
		return "";
	}

	var __construct = function(that)
	{
		var width = 197;
		var height = 154;

		if (options != null)
		{
			if (options.width != null)
			{
				width = options.width;
			}
			if (options.height != null)
			{
				height = options.height;
			}
		}
		else
		{
			options = new Array();
		}

		var links = document.getElementsByClassName("grabzit-preview");

		for (var i = 0; i < links.length; i++)
		{
			var link = links[i];
			var href = link.getAttribute("href");
			if (link.getAttribute("grabzit-href") != null)
			{
				href = link.getAttribute("grabzit-href");
			}
			var captionText = link.getAttribute("title");
			var guid = that._guid();

			var rect = link.getBoundingClientRect()
			var pos = rect.left;
			var leftOrRight = "left";

			if ((pos + width + 50) > window.innerWidth)
			{
				leftOrRight = "right";
				pos = 10;
			}

			var div = document.createElement('div');
			div.setAttribute("style","display:none;z-index:100000;position:absolute;"+leftOrRight+":"+pos+"px;");
			div.id = guid;
			div.className = "grabzit-preview-container";

			var divLoading = document.createElement('div');
			divLoading.setAttribute("style","width:"+width+"px;height:"+height+"px;");
			divLoading.className = "grabzit-preview-loader";

			var img = document.createElement('img');
			img.src = "data:image/gif;base64,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";

			img.setAttribute("style","width:66px;height:66px;margin-left:"+(Math.round(width/2)-(66/2))+"px;margin-top:"+(Math.round(height/2)-(66/2))+"px;");

			divLoading.appendChild(img);

			div.appendChild(divLoading);

			var divFrame = document.createElement('div');
			divFrame.setAttribute("style","display:none;width:"+width+"px;height:"+height+"px;");
			divFrame.className = "grabzit-preview-screenshot-frame";

			options['width'] = width;
			options['height'] = height;
			options['displayid'] = 'grabzit-screenshot-result';
			options['errorid'] = 'grabzit-screenshot-result';
			options['errorclass'] = 'grabzit-preview-error';
			options['displayclass'] = 'grabzit-preview-screenshot';
			options['onfinish'] = 'GrabzItPreviewFinished';
			options['onerror'] = 'GrabzItPreviewFinished';

			try
			{
				GrabzIt(key).ConvertURL(href, options).AddTo(divFrame);
			}
			catch(e)
			{
				alert(e);
			}

			div.appendChild(divFrame);

			var divCaption = document.createElement('div');
			divCaption.innerHTML = captionText;
			divCaption.className = "grabzit-preview-caption";
			div.appendChild(divCaption);

			link.parentNode.insertBefore(div, link.nextSibling);
			link.setAttribute('onmouseout', that._getJSFunction(link.getAttribute('onmouseout')) + "document.getElementById('"+guid+"').style.display='none';");
			link.setAttribute('onmouseover', that._getJSFunction(link.getAttribute('onmouseover')) + "document.getElementById('"+guid+"').style.display='block';");
		}
	}(this)
}