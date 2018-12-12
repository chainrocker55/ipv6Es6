function btnClick(){
    var ip=document.getElementById("ip").value
    if(isValid(ip)){
        var prefix = parseInt(document.getElementById("prefix").value)
        var range = callrange(ip, prefix, 128)
        var network = abbreviate(range.start)
        var fullIP = normalize(ip)
        var num = 128 - prefix;
        var totolIP = BigNumber(2).power((num)).toString()
        var integerIP = totalIPCalculate(fullIP).toString()
        var dottedID = convertIpToDecimal(fullIP)
        console.log(dottedID)
        document.getElementById("IPaddress").innerHTML=abbreviate(ip)+"/"+prefix
        document.getElementById("Network").innerHTML=network
        document.getElementById("Prefixlength").innerHTML=prefix
        document.getElementById("range").innerHTML=range.start+" - "+range.end
        document.getElementById("totalIP").innerHTML=totolIP
        document.getElementById("IPfull").innerHTML=fullIP
        document.getElementById("integerID").innerHTML=integerIP
        document.getElementById("hexadecimalID").innerHTML="0x"+fullIP
        document.getElementById("dottedID").innerHTML=dottedID.join(".")
        
        renderSubnet(ip)
    }
    else{
        window.location="error.html";
    }
}
function getValue(ip, i) {
    var prefix = parseInt(document.getElementById("prefix").value)
    console.log(i)
    console.log(ip)
    var queryString = "?ip=" + ip + "&i=" + i + "&prefix=" + prefix
    // window.location.href = "subnet.html" + queryString;
    window.open("showSubnet.html" + queryString, "_blank")
}