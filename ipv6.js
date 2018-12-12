
let normalize = function (a) {
    if (!_validate(a)) {
        throw new Error('Invalid address: ' + a);
    }
    a = a.toLowerCase()

    let nh = a.split(/\:\:/g);
    if (nh.length > 2) {
        throw new Error('Invalid address: ' + a);
    }

    let sections = [];
    if (nh.length == 1) {
        // full mode
        sections = a.split(/\:/g);
        if (sections.length !== 8) {
            throw new Error('Invalid address: ' + a);
        }
    } else if (nh.length == 2) {
        // compact mode
        let n = nh[0];
        let h = nh[1];
        let ns = n.split(/\:/g);
        let hs = h.split(/\:/g);
        for (let i in ns) {
            sections[i] = ns[i];
        }
        for (let i = hs.length; i > 0; --i) {
            sections[7 - (hs.length - i)] = hs[i - 1];
        }
    }
    for (let i = 0; i < 8; ++i) {
        if (sections[i] === undefined) {
            sections[i] = '0000';
        }
        sections[i] = _leftPad(sections[i], '0', 4);
    }
    return sections.join(':');
};

let abbreviate = function (a) {
    if (!_validate(a)) {
        throw new Error('Invalid address: ' + a);
    }
    a = normalize(a);
    a = a.replace(/0000/g, 'g');
    a = a.replace(/\:000/g, ':');
    a = a.replace(/\:00/g, ':');
    a = a.replace(/\:0/g, ':');
    a = a.replace(/g/g, '0');
    let sections = a.split(/\:/g);
    let zPreviousFlag = false;
    let zeroStartIndex = -1;
    let zeroLength = 0;
    let zStartIndex = -1;
    let zLength = 0;
    for (let i = 0; i < 8; ++i) {
        let section = sections[i];
        let zFlag = (section === '0');
        if (zFlag && !zPreviousFlag) {
            zStartIndex = i;
        }
        if (!zFlag && zPreviousFlag) {
            zLength = i - zStartIndex;
        }
        if (zLength > 1 && zLength > zeroLength) {
            zeroStartIndex = zStartIndex;
            zeroLength = zLength;
        }
        zPreviousFlag = (section === '0');
    }
    if (zPreviousFlag) {
        zLength = 8 - zStartIndex;
    }
    if (zLength > 1 && zLength > zeroLength) {
        zeroStartIndex = zStartIndex;
        zeroLength = zLength;
    }
    //console.log(zeroStartIndex, zeroLength);
    //console.log(sections);
    if (zeroStartIndex >= 0 && zeroLength > 1) {
        sections.splice(zeroStartIndex, zeroLength, 'g');
    }
    //console.log(sections);
    a = sections.join(':');
    //console.log(a);
    a = a.replace(/\:g\:/g, '::');
    a = a.replace(/\:g/g, '::');
    a = a.replace(/g\:/g, '::');
    a = a.replace(/g/g, '::');
    //console.log(a);
    return a;
};

// Basic validation
let _validate = function (a) {
    return /^[a-f0-9\\:]+$/ig.test(a);
};

let _leftPad = function (d, p, n) {
    let padding = p.repeat(n);
    if (d.length < padding.length) {
        d = padding.substring(0, padding.length - d.length) + d;
    }
    return d;
};

let _hex2bin = function (hex) {
    return parseInt(hex, 16).toString(2)
};
let _bin2hex = function (bin) {
    return parseInt(bin, 2).toString(16)
};

let _addr2bin = function (addr) {
    let nAddr = normalize(addr);
    let sections = nAddr.split(":");
    let binAddr = '';
    for (let section of sections) {
        binAddr += _leftPad(_hex2bin(section), '0', 16);
    }
    return binAddr;
};

let _bin2addr = function (bin) {
    let addr = [];
    for (let i = 0; i < 8; ++i) {
        let binPart = bin.substr(i * 16, 16);
        let hexSection = _leftPad(_bin2hex(binPart), '0', 4);
        addr.push(hexSection);
    }
    return addr.join(':');
};

let divideSubnet = function (addr, mask0, mask1, limit, abbr) {
    if (!_validate(addr)) {
        throw new Error('Invalid address: ' + addr);
    }
    mask0 *= 1;
    mask1 *= 1;
    limit *= 1;
    mask1 = mask1 || 128;
    if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
        throw new Error('Invalid masks.');
    }
    let ret = [];
    let binAddr = _addr2bin(addr);
    let binNetPart = binAddr.substr(0, mask0);
    let binHostPart = '0'.repeat(128 - mask1);
    let numSubnets = Math.pow(2, mask1 - mask0);
    for (let i = 0; i < numSubnets; ++i) {
        if (!!limit && i >= limit) {
            break;
        }
        let binSubnet = _leftPad(i.toString(2), '0', mask1 - mask0);
        let binSubAddr = binNetPart + binSubnet + binHostPart;
        let hexAddr = _bin2addr(binSubAddr);
        if (!!abbr) {
            ret.push(abbreviate(hexAddr));
        } else {
            ret.push(hexAddr);
        }

    }
    // console.log(numSubnets);
    // console.log(binNetPart, binSubnetPart, binHostPart);
    // console.log(binNetPart.length, binSubnetPart.length, binHostPart.length);
    // console.log(ret.length);
    return ret;
};

let range = function (addr, mask0, mask1, abbr) {
    if (!_validate(addr)) {
        throw new Error('Invalid address: ' + addr);
    }
    mask0 *= 1;
    mask1 *= 1;
    mask1 = mask1 || 128;
    if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
        throw new Error('Invalid masks.');
    }
    let binAddr = _addr2bin(addr);
    let binNetPart = binAddr.substr(0, mask0);
    let binHostPart = '0'.repeat(128 - mask1);
    let binStartAddr = binNetPart + '0'.repeat(mask1 - mask0) + binHostPart;
    let binEndAddr = binNetPart + '1'.repeat(mask1 - mask0) + binHostPart;
    if (!!abbr) {
        return {
            start: abbreviate(_bin2addr(binStartAddr)),
            end: abbreviate(_bin2addr(binEndAddr)),
            size: Math.pow(2, mask1 - mask0)
        };
    } else {
        return {
            start: _bin2addr(binStartAddr),
            end: _bin2addr(binEndAddr),
            size: Math.pow(2, mask1 - mask0)
        };
    }
};

let randomSubnet = function (addr, mask0, mask1, limit, abbr) {
    if (!_validate(addr)) {
        throw new Error('Invalid address: ' + addr);
    }
    mask0 *= 1;
    mask1 *= 1;
    limit *= 1;
    mask1 = mask1 || 128;
    limit = limit || 1;
    if (mask0 < 1 || mask1 < 1 || mask0 > 128 || mask1 > 128 || mask0 > mask1) {
        throw new Error('Invalid masks.');
    }
    let ret = [];
    let binAddr = _addr2bin(addr);
    let binNetPart = binAddr.substr(0, mask0);
    let binHostPart = '0'.repeat(128 - mask1);
    let numSubnets = Math.pow(2, mask1 - mask0);
    for (let i = 0; i < numSubnets && i < limit; ++i) {
        // generate an binary string with length of mask1 - mask0
        let binSubnet = '';
        for (let j = 0; j < mask1 - mask0; ++j) {
            binSubnet += Math.floor(Math.random() * 2);
        }
        let binSubAddr = binNetPart + binSubnet + binHostPart;
        let hexAddr = _bin2addr(binSubAddr);
        if (!!abbr) {
            ret.push(abbreviate(hexAddr));
        } else {
            ret.push(hexAddr);
        }
    }
    // console.log(numSubnets);
    // console.log(binNetPart, binSubnetPart, binHostPart);
    // console.log(binNetPart.length, binSubnetPart.length, binHostPart.length);
    // console.log(ret.length);
    return ret;
};

let ptr = function (addr, mask) {
    if (!_validate(addr)) {
        throw new Error('Invalid address: ' + addr);
    }
    mask *= 1;
    if (mask < 1 || mask > 128 || Math.floor(mask / 4) != mask / 4) {
        throw new Error('Invalid masks.');
    }
    let fullAddr = normalize(addr);
    let reverse = fullAddr.replace(/:/g, '').split('').reverse();
    return reverse.slice(0, (128 - mask) / 4).join('.');
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    exports.normalize = normalize;
    exports.abbreviate = abbreviate;
    exports.divideSubnet = divideSubnet;
    exports.range = range;
    exports.randomSubnet = randomSubnet;
    exports.ptr = ptr;
} else {
    window.normalize = normalize;
    window.abbreviate = abbreviate;
    window.divideSubnet = divideSubnet;
    window.range = range;
    window.randomSubnet = randomSubnet;
    window.ptr = ptr;
}
 function showSubnet(ip,prefix,i) {
   let subnets = divideSubnet(ip, prefix, i);
    var div = document.getElementById("render")
     console.log(subnets)
   
        for (var i=0; i < subnets.length; i++) {
            var p = document.createElement("span");
            p.textContent=""+subnets[i]
            p.test="dd"
            div.appendChild(p)
            var br = document.createElement("br");
            div.appendChild(br)
        }
        
   
    
}
function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
          tmp = item.split("=");
          if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}
function isValid(ip_string) {
    var regex = /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/
    var regex2 = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/

    console.log("regex " + regex.test(ip_string))
    console.log("regex " + regex2.test(ip_string))
    if (!regex.test(ip_string)) {
        return false
    }
    if (!regex2.test(ip_string)) {
        return false
    }
    return true;
}
function prefix(){
    var network_message='addresses/64'
    var arr=new Array("1 (9,223,372,036,854,775,808 " + network_message + ")","2 (4,611,686,018,427,387,904 " + network_message + ")","3 (2,305,843,009,213,693,952 " + network_message + ")","4 (1,152,921,504,606,846,976 " + network_message + ")","5 (576,460,752,303,423,488 " + network_message + ")","6 (288,230,376,151,711,744 " + network_message + ")","7 (144,115,188,075,855,872 " + network_message + ")","8 (72,057,594,037,927,936 " + network_message + ")","9 (36,028,797,018,963,968 " + network_message + ")","10 (18,014,398,509,481,984 " + network_message + ")","11 (9,007,199,254,740,992 " + network_message + ")","12 (4,503,599,627,370,496 " + network_message + ")","13 (2,251,799,813,685,248 " + network_message + ")","14 (1,125,899,906,842,624 " + network_message + ")","15 (562,949,953,421,312 " + network_message + ")","16 (281,474,976,710,656 " + network_message + ")","17 (140,737,488,355,328 " + network_message + ")","18 (70,368,744,177,664 " + network_message + ")","19 (35,184,372,088,832 " + network_message + ")","20 (17,592,186,044,416 " + network_message + ")","21 (8,796,093,022,208 " + network_message + ")","22 (4,398,046,511,104 " + network_message + ")","23 (2,199,023,255,552 " + network_message + ")","24 (1,099,511,627,776 " + network_message + ")","25 (549,755,813,888 " + network_message + ")","26 (274,877,906,944 " + network_message + ")","27 (137,438,953,472 " + network_message + ")","28 (68,719,476,736 " + network_message + ")","29 (34,359,738,368 " + network_message + ")","30 (17,179,869,184 " + network_message + ")","31 (8,589,934,592 " + network_message + ")","32 (4,294,967,296 " + network_message + ")","33 (2,147,483,648 " + network_message + ")","34 (1,073,741,824 " + network_message + ")","35 (536,870,912 " + network_message + ")","36 (268,435,456 " + network_message + ")","37 (134,217,728 " + network_message + ")","38 (67,108,864 " + network_message + ")","39 (33,554,432 " + network_message + ")","40 (16,777,216 " + network_message + ")","41 (8,388,608 " + network_message + ")","42 (4,194,304 " + network_message + ")","43 (2,097,152 " + network_message + ")","44 (1,048,576 " + network_message + ")","45 (524,288 " + network_message + ")","46 (262,144 " + network_message + ")","47 (131,072 " + network_message + ")","48 (65,536 " + network_message + ")","49 (32,768 " + network_message + ")","50 (16,384 " + network_message + ")","51 (8,192 " + network_message + ")","52 (4,096 " + network_message + ")","53 (2,048 " + network_message + ")","54 (1,024 " + network_message + ")","55 (512 " + network_message + ")","56 (256 " + network_message + ")","57 (128 " + network_message + ")","58 (64 " + network_message + ")","59 (32 " + network_message + ")","60 (16 " + network_message + ")","61 (8 " + network_message + ")","62 (4 " + network_message + ")","63 (2 " + network_message + ")","64 (18,446,744,073,709,551,616 addresses)","65 (9,223,372,036,854,775,808 addresses)","66 (4,611,686,018,427,387,904 addresses)","67 (2,305,843,009,213,693,952 addresses)","68 (1,152,921,504,606,846,976 addresses)","69 (576,460,752,303,423,488 addresses)","70 (288,230,376,151,711,744 addresses)","71 (144,115,188,075,855,872 addresses)","72 (72,057,594,037,927,936 addresses)","73 (36,028,797,018,963,968 addresses)","74 (18,014,398,509,481,984 addresses)","75 (9,007,199,254,740,992 addresses)","76 (4,503,599,627,370,496 addresses)","77 (2,251,799,813,685,248 addresses)","78 (1,125,899,906,842,624 addresses)","79 (562,949,953,421,312 addresses)","80 (281,474,976,710,656 addresses)","81 (140,737,488,355,328 addresses)","82 (70,368,744,177,664 addresses)","83 (35,184,372,088,832 addresses)","84 (17,592,186,044,416 addresses)","85 (8,796,093,022,208 addresses)","86 (4,398,046,511,104 addresses)","87 (2,199,023,255,552 addresses)","88 (1,099,511,627,776 addresses)","89 (549,755,813,888 addresses)","90 (274,877,906,944 addresses)","91 (137,438,953,472 addresses)","92 (68,719,476,736 addresses)","93 (34,359,738,368 addresses)","94 (17,179,869,184 addresses)","95 (8,589,934,592 addresses)","96 (4,294,967,296 addresses)","97 (2,147,483,648 addresses)","98 (1,073,741,824 addresses)","99 (536,870,912 addresses)","100 (268,435,456 addresses)","101 (134,217,728 addresses)","102 (67,108,864 addresses)","103 (33,554,432 addresses)","104 (16,777,216 addresses)","105 (8,388,608 addresses)","106 (4,194,304 addresses)","107 (2,097,152 addresses)","108 (1,048,576 addresses)","109 (524,288 addresses)","110 (262,144 addresses)","111 (131,072 addresses)","112 (65,536 addresses)","113 (32,768 addresses)","114 (16,384 addresses)","115 (8,192 addresses)","116 (4,096 addresses)","117 (2,048 addresses)","118 (1,024 addresses)","119 (512 addresses)","120 (256 addresses)","121 (128 addresses)","122 (64 addresses)","123 (32 addresses)","124 (16 addresses)","125 (8 addresses)","126 (4 addresses)","127 (2 addresses)","128 (1 address)")
    var prefix=document.getElementById("prefix")
    for(var i=0;i<arr.length;i++){
        var option = document.createElement("option");
        option.text=arr[i]
        option.value = i+1
        if (i == 64) {
            option.selected = true
        }
        prefix.add(option)
    }
    
}
function convertIpToDecimal(ip) {
    var ipv6 = ip.split(":")
    var ipv6toHex2 = [];
    for (var i = 0; i < ipv6.length; i++) {
        for (var j = 0; j < ipv6[i].length; j += 2) {
            ipv6toHex2.push(ipv6[i].substr(j, j + 2))
            //console.log(ipv6[i].substr(j,j+2))
        }
    }
    var ipv6toDec = [];
    for (var i = 0; i < ipv6toHex2.length; i++) {
        ipv6toDec.push(parseInt(ipv6toHex2[i], 16).toString(10))
    }
    return ipv6toDec;
}
function totalIPCalculate(ipfull) {
var ipfull=ipfull.split(":")
 var ip=ipfull.join("").toString().toLowerCase()
  console.log(ip)
  var total = BigNumber(0)
  for (var i = 0; i < ip.length; i++) {
      if (ip.substring(i, i + 1) != '0') {
          var n = 32 - i - 1
          var value=ip.substring(i, i + 1)
          if(value=='a'||value=='b'||value=='c'||value=='d'||value=='f'){
              value=parseInt(value, 16).toString(10)
          }
          total.plus(BigNumber(16).power(n).multiply(value))
      }

  }
  console.log(total.toString())
  return total;
}
function callrange(ip,prefix,n){
    return range(ip, prefix, 128)
}
function renderSubnet(ip) {
    var prefix = parseInt(document.getElementById("prefix").value)
    var div = document.getElementById("subnet")
    for (var i = prefix + 1, j = 1; i <= 128; i++ , j++) {
        var x = BigNumber(2).power(j).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        var a = document.createElement("a");
        a.text = x + " networks /" + i
        a.href = "javascript:getValue(\"" + ip + "\"," + i + ")"
        a.value = i
        
        div.appendChild(a)
        var br = document.createElement("br");
        div.appendChild(br)
    }
}