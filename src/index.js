var filePath;

function gettext(pdfUrl){
    var pdf = pdfjsLib.getDocument(pdfUrl).promise;
    return pdf.then(function(pdf) {
      var countPromises = []; // collecting all page promises
        var page = pdf.getPage(1);
       
        countPromises.push(page.then(function(page) { // add page promise
          var textContent = page.getTextContent();
          
          return textContent.then(function(text){ // return content promise
            //return text.items.map(function (s) { return s.str; })// value page text 
            return text
          });
        }));
      
      // Wait for all pages and join text
       return Promise.all(countPromises).then(function (texts) {
        return texts[0].items;
         });
    });
  }
  
  // waiting on gettext to finish completion, or error
  function readFile(fileURL,startDate){

    const columnTitles = [];
    const weekDays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    
    gettext(fileURL).then(function (text) {
      let columns = {}
      let rows = {}
      let i = 0;
      // get the columns
      text.forEach(word => {
        if(word.str.toLowerCase() == "1st week" || word.str.toLowerCase() == "2nd week"){
          columns[i] = word;
          i++;
        }
      });

      const regexTR = new RegExp('([1-4]+\\.|[1-4]+.\\s)s[ıi]n[ıi]f');
      const regexEN = new RegExp('(1st|2nd|3rd|4th)\\syear');
      const regexTime = new RegExp('([0-9][0-9])+:+(([0-9][0-9]))+-+([0-9][0-9])+:+(([0-9][0-9]))');
      rows = text.filter(word =>regexTR.test(word.str) || regexEN.test(word.str))
      showRows = {...rows};
      rows = rows.map((row, index, elements) => {
        next = elements[index+1];
        if(regexTR.test(row.str)){
          return (row.transform[5] + next.transform[5])/2;
        }
      })
      rows = rows.filter(row => typeof row != "undefined");
      rows.sort(function(a, b){return b-a});
      rows = rows.filter((v, i, a) => a.indexOf(v) === i);



      // insert all the content of the row to the columns object
      // and delete the empty rows
      let temp = Object.keys(columns)
      let orgColumns = {...columns};
      temp.forEach(key => {
        columns[key] = text.filter(value => value.transform[4] > columns[key].transform[4]-30 && value.transform[4] < columns[key].transform[4]+30 )
        columns[key] = columns[key].filter((value) => value.str.trim() != "")
        columns[key] = columns[key].filter(value => !regexTR.test(value.str) || !regexEN.test(value.str) || !regexTime.test(value.str.trim()));
        columns[key] = columns[key].filter(value => value.str.trim() != "Saatler/Slots");
      });
      try{
        for(let i = 0 ; i < Object.keys(columns).length - 1; i++){
          columns[i].forEach(left => {
            columns[i+1].forEach(right => {         
              if(left == right && Math.abs(left.transform[5]-right.transform[5]) < 5 ){
                let distanceLeft = Math.abs(left.transform[4] - orgColumns[i].transform[4]);
                let distanceRight = Math.abs(right.transform[4] - orgColumns[i+1].transform[4]);
                if(distanceLeft > distanceRight){
                deleteByVal(left,columns[i]);
                }
                else if(distanceLeft < distanceRight){
                deleteByVal(right,columns[i+1]);
                }
              }
            })
          });
          
        }
      }catch(error){
        showErrorOnHTML("Please upload an VALID exam schedule PDF file which is created by UU MDBF!")
        showOutput("An error occured. See the output below.","failed")
        throw error;
      }
      

      //delete unnecessary data at the top and end
      table = {};
      for(let i = 0; i < Object.keys(columns).length ;i++){
        let ifFound = false;
        columns[i].forEach(row => {
          let isInclude = false;
          weekDays.forEach(day =>{
            if(row.str.includes(day)){
              isInclude = true;
              columnTitles.push(day);
            }
          })
          if(!isInclude && !ifFound){
            delete deleteByVal(row,columns[i]);
          }else if(isInclude){
            delete deleteByVal(row,columns[i]);
            ifFound = true;
          }
        })
      }
      filteredArray = weekDays.filter(day =>  !columnTitles.includes(day));
      let day = 0;
      let currentDate;
      let date;
      
      for(let i = 0 ; i < Object.keys(columns).length ; i++){

        while(filteredArray.includes(weekDays[(day+1)%7])){
          day++
          onceIncrease = true
        }
        currentDate = startDate.addDays(day);
        date = currentDate.getDate()+ "/"+ (currentDate.getMonth()+1)+"/"+currentDate.getFullYear() + " " + weekDays[currentDate.getDay()];
    
        day++;

        let inPar = false;
        let rowNumber = 0;
        columns[i] = columns[i].filter(n => n);
        columns[i].forEach((row, index) =>{})
        let arrLength = columns[i].length;
        for(let z = 0 ; z<arrLength; z++){
          let row = columns[i][z];
          let index = z;
          if(row.str.charAt(0) == "["){
            inPar = true;
          }
          let match = row.str.match(/([A-Z]+( |)\d+)+( |\r)+[A-Z,a-z]+/g) == null ? []: row.str.match(/([A-Z]+( |)\d+)+( |\r)+[A-Z,a-z]+/g)
          if(inPar == true && match.length > 0){
            console.log(row);
            console.log("asd");
            // columns[i].splice(index-1, 0, row);
            row = columns[i][index-1];
            row.str += "undefined]";
            columns[i].splice(index-1, 0, row);
            // delete columns[i][index+1];
           
            row = columns[i][index-1];
            console.log(row);
            rowNumber--;
            index--
            // arrLength++;
          }
          if(row.str.slice(-1)=="]"){
            inPar = false;
            let rowHeight = 0
            for(let j = index-rowNumber ; j<= index ; j++){
              rowHeight += columns[i][j].transform[5];
            }

            rowHeight /= (rowNumber+1);

            let closestIndex = 0;
            let closestHeight = 100;
            rows.forEach((line, rowIndex)=>{
              let distance = Math.abs(line - rowHeight);
              if(closestHeight > distance){
                closestIndex = rowIndex;
                closestHeight = distance;
              }
            })
              rows.forEach((line, ind) => {
                if(ind == closestIndex){
                  columns[i][index-rowNumber].str += " ****"+date+"****";
                  switch (ind % 4) {
                    case 0:
                      columns[i][index-rowNumber].str += " 1st year";
                      break;
                    case 1:
                      columns[i][index-rowNumber].str += " 2nd year";
                      break;
                    case 2:
                      columns[i][index-rowNumber].str += " 3rd year";
                      break;
                    case 3:
                      columns[i][index-rowNumber].str += " 4th year";
                      break;
                  }

                  if(ind >= 0 && ind<4){
                    columns[i][index-rowNumber].str += " ----09:00----";
                  }
                  else if(ind >= 4 && ind<8){
                    columns[i][index-rowNumber].str += " ----10:00----";
                  }
                  else if(ind >= 8 && ind<12){
                    columns[i][index-rowNumber].str += " ----11:00----";
                  }
                  else if(ind >= 12 && ind<16){
                    columns[i][index-rowNumber].str += " ----12:00----";
                  }
                  else if(ind >= 16 && ind<20){
                    columns[i][index-rowNumber].str += " ----13:00----";
                  }
                  else if(ind >= 20 && ind<24){
                    columns[i][index-rowNumber].str += " ----14:00----";
                  }
                  else if(ind >= 24 && ind<28){
                    columns[i][index-rowNumber].str += " ----15:00----";
                  }
                  else if(ind >= 28 && ind<32){
                    columns[i][index-rowNumber].str += " ----16:00----";
                  }
                  else if(ind >= 32 && ind<36){
                    columns[i][index-rowNumber].str += " ----17:00----";
                  }
                  else if(ind >= 36 && ind<40){
                    columns[i][index-rowNumber].str += " ----18:00----";
                  }
                  else if(ind >= 40 && ind<44){
                    columns[i][index-rowNumber].str += " ----19:00----";
                  }
                  else if(ind >= 44 && ind<48){
                    columns[i][index-rowNumber].str += " ----20:00----";
                  }
                  else if(ind >= 48 && ind<52){
                    columns[i][index-rowNumber].str += " ----21:00----";
                  }


                }
              }
              )
            rowNumber = 0;
          }
          else{
            rowNumber ++;
          }
        }
      }

      // Join all columns content to string
      for(let i = 0; i < Object.keys(columns).length ; i++){
        table[i] = "";
        columns[i].forEach(row => {
          table[i] += row.str + " ";
        })
        table[i] = table[i].split(/(])/g);
        table[i] = table[i].map((row, index, elements) => {
          next = elements[index+1];
          if(next =="]"){
            return row.trim() + next;
          }
        })
        table[i] = table[i].filter(row => typeof row!= "undefined");
      }
      
      // let textArea = document.getElementById('text-area')
      // textArea.value='';
      
      // // for(let i = 0; i<10;i++){
      // //   textArea.value+=columnTitles[i]+":\n";
      // //   textArea.value+=table[i].join("\n");
      // //   textArea.value+="\n\n";
      // // }
      // let examsList = getListByYear(table,2);
      // for(let i = 0; i<examsList.length;i++){
      //   textArea.value += examsList[i].course +"\n";
      //   textArea.value += examsList[i].date +"\n";
      //   textArea.value += examsList[i].time +" ";
      //   textArea.value += examsList[i].location +"\n\n";
      // }
      console.log(table);
      console.log(columns);
      let boxes = document.getElementsByName("year");
      let years=[]
      boxes.forEach(box=>{
        if(box.checked){
          years.push(box.value);
        }
      })
      createHTMLTable(getListByYear(table,years));
      return table;
      }, 
      function (reason) {
        showErrorOnHTML("Please make sure that you are imported a valid PDF file");
        showOutput("An error occured. See the output below.","failed")
        throw new Error("Please make sure that you are imported a valid PDF file");
        
      });
  }
  function toObjectList(table){
    exams=[];
    index=0;
    for(let i = 0 ; i < Object.keys(table).length ; i++){
      
      table[i].forEach((cell) => {
        let time = cell.match(/\-\-\-\-([^\*]*)\-\-\-\-/g)
        cell = cell.replace(/\-\-\-\-([^\*]*)\-\-\-\-/g,"");

        let year = cell.match(/(1st|2nd|3rd|4th)\syear/g)
        cell = cell.replace(/(1st|2nd|3rd|4th)\syear/g,"")

        let location = cell.match(/(\[[^\]]*\])/g);
        cell = cell.replace(/(\[[^\]]*\])/g,"")

        let date = cell.match(/\*\*\*\*([^\*]*)\*\*\*\*/g);
        cell = cell.replace(/\*\*\*\*([^\*]*)\*\*\*\*/g,"")

        isSame = false;
        for(let j = 0 ; j < exams.length;j++){
            if(exams[j].course == cell.replace("  ","") && exams[j].location == location[0] && exams[j].year == year[0]) {
              isSame = true;
            }
        }
        if(!isSame){
          try{
            exams.push({
              "course":cell.replace("  ",""),
              "location":location[0],
              "year":year[0],
              "time":time[0].replaceAll("-",""),
              "date":date[0].replaceAll("*","")
          })
          }catch(error){
            console.log(error);
          }
          
        index++;
      }
      })
    }
    return exams;
  }

  function getListByYear(table, year){
    let examsList = toObjectList(table);
    let response = [];
    for(let i = 0; i < examsList.length ; i++){
      for(let j = 0 ; j < year.length ; j++){
        if(examsList[i].year.charAt(0) == year[j]){
          response.push(examsList[i]);
        }
      }
    }
    return response;
  }

  function deleteByVal(val,obj) {
    let isDeleted = false;
    for (var key in obj) {
        if (obj[key] == val  && !isDeleted){
          delete obj[key]
          isDeleted = true;
        }
    }
}

function createHTMLTable(list){
  let main = document.getElementById("container");
  let child = main.lastElementChild;
  while(child){
    main.removeChild(child);
    child = main.lastElementChild;
  }
  try {
    let ifExist = document.getElementById("TableToExport");
    ifExist.remove();
    ifExist = document.getElementById("sheetjsexport");
    ifExist.remove();
    
  } catch (error) {
    
  }
  let div = main.appendChild(document.createElement("div"));
  div.setAttribute("class","export");

  let container = main.appendChild(document.createElement("div"));
  
  var table = document.createElement('table');
  table.id = "TableToExport";
  var titles = document.createElement('tr');
  titles.class = "title";
  let headerContent = ["Date (dd/mm/yyyy)","Course", "Time", "Location", "Year"]
 //create headers
  let header = document.createElement('th')  
    titles.appendChild(header);
  for(let i = 0 ; i< headerContent.length ; i++){
    let header = document.createElement('th')
    header.appendChild(document.createTextNode(headerContent[i]))
    titles.appendChild(header);
  }
  table.appendChild(titles);
  for (let i = 0; i < list.length; i++){
    let tr = document.createElement('tr');
    let td = document.createElement('td');
    let button = document.createElement('input');
    button.appendChild(document.createTextNode("Delete"));
    button.setAttribute("type","button");
    button.setAttribute("class","delete");
    button.setAttribute("value","x");
    button.setAttribute("onclick","DeleteRow(this)");
    td.appendChild(button)
    tr.appendChild(td);
    table.appendChild(tr);
    tr.appendChild(td);
    for(let j = 0; j< headerContent.length; j++){
      td = document.createElement('td');
      td.appendChild(document.createTextNode(list[i][headerContent[j].split(" ")[0].toLowerCase()]))
      tr.appendChild(td);
    }

  }

  
  container.appendChild(table);
  // document.body.appendChild(table);
  

  let span1 = document.createElement("span");
  let span2 = document.createElement("span");

  let exportButton = document.createElement("input");
  exportButton.setAttribute("type","button")
  exportButton.setAttribute("onclick","exportXLSX()");
  exportButton.id = "sheetjsexport";
  exportButton.value = "Export as XLSX";
  span1.appendChild(exportButton);
  
  let printButton = document.createElement("input");
  printButton.setAttribute("type","button")
  printButton.setAttribute("onclick","printData()");
  printButton.id = "printbutton";
  printButton.value = "Export as PDF/Print";
  span2.appendChild(printButton);

 
  div.appendChild(span1);
  div.appendChild(span2);
  showOutput("Created successfully in below!","successed");
}

function showErrorOnHTML(string){
let container = document.getElementById("container");
let child = container.lastElementChild;
while(child){
  container.removeChild(child);
  child = container.lastElementChild;
}
let text = container.appendChild(document.createElement("p"));
text.setAttribute("class","error");
text.appendChild(document.createTextNode(string))
container.appendChild(text);
}

Date.prototype.addDays = function(days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}
function DeleteRow(o) {
  let p=o.parentNode.parentNode;
      p.parentNode.removeChild(p);
 }
 function exportXLSX() {
  /* Create worksheet from HTML DOM TABLE */
  var wb = XLSX.utils.table_to_book(document.getElementById("TableToExport"));
  /* Export to file (start a download) */
  XLSX.writeFile(wb, "ExamList.xlsx");
};
function main(){
  let rad1 = document.getElementById("radioPdf");
  let rad2 = document.getElementById("radioLink");
  let fileURL;
  if(rad1.checked){
    try{
      const file = document.getElementById('pdf').files[0];
      fileURL = window.URL.createObjectURL(file);
    }catch{
      showErrorOnHTML("Please upload an exam schedule PDF file which is created by UU MDBF!")
      showOutput("An error occured. See the output below.","failed")
    throw new Error("Please upload a PDF which is created by UU MDBF");
    }
  }else if(rad2.checked){
    let link = document.getElementById("link").value;
    if(link !=""){
      fileURL = link;
    }else{
      showErrorOnHTML("Please provide an exam schedule link via UU MDBF Website")
      showOutput("An error occured. See the output below.","failed")
      throw new Error("Please provide an exam schedule link via UU MDBF Website");
    }
      
    }
   else{
    showErrorOnHTML("Please select an option to import the PDF file.")
    showOutput("An error occured. See the output below.","failed")
    throw new Error("Please select an option to import the PDF file.");
  }
  
  let boxes = document.getElementsByName("year");
 if(!(boxes[0].checked ||boxes[1].checked || boxes[2].checked || boxes[3].checked)){
    showErrorOnHTML("Choose at least one of the options above (e.g: 1st year).")
    showOutput("An error occured. See the output below.","failed")
    throw new Error("Choose at least one of the options above");
  }

  const date = document.getElementById('date').value;
  let startDate;
  if(date == ""){
    startDate = new Date(2022, 5, 20);
  }else{
    let day,month,year;
    [year,month,day] = date.split("-")
    startDate = new Date(year,month-1,day);
    if(isNaN(startDate)){
      showErrorOnHTML("Please make sure that you write the date in correct format. (DD/MM/YYYY)")
      showOutput("An error occured. See the output below.","failed")
      throw new Error("Please make sure that you write the date in correct format. (DD/MM/YYYY)");
    }
    
    
    
  }
    readFile(fileURL,startDate);
    // new Promise(resolve => setTimeout(resolve, 800)).then(()=>{
    //   let div = document.getElementById("container");
    //   window.scrollTo(0,document.body.scrollHeight);
    // })
    
  
}

function changeInputStatus(owner){
  let input1 = document.getElementById('pdf');
  let input2 = document.getElementById('link');
  if(owner == "pdf"){
    input1.disabled = false;
    input2.disabled= true 

  }else if(owner == "link"){
    input1.disabled =true;
    input2.disabled= false; 
  }
}

document.addEventListener("change", checkMandatorySection);

function checkMandatorySection(){
  let input1 = document.getElementById('pdf');
  let input2 = document.getElementById('link');

 

  let checkbox1 = document.getElementById('1st');
  let checkbox2 = document.getElementById('2nd');
  let checkbox3 = document.getElementById('3rd');
  let checkbox4 = document.getElementById('4th');

  let button = document.getElementById('input-button');

  let inputsAreFilled;

  if(document.getElementById("radioPdf").checked){
    inputsAreFilled = input1.value != "";
  }else if(document.getElementById("radioLink").checked){
    inputsAreFilled = input2.value != "";
  }

  let boxesAreFilled = checkbox1.checked || checkbox2.checked || checkbox3.checked || checkbox4.checked;
  if(inputsAreFilled && boxesAreFilled){
    button.disabled = false;
  }
  else{
    button.disabled = true;
  }
}

function scrollToBottom(){
  window.scrollTo(0,document.body.scrollHeight);

}

function showOutput(message, type){
  let output = document.getElementById("output");
  let child = output.lastElementChild;
  while(child){
    output.removeChild(child);
    child = output.lastElementChild;
  }
  output.setAttribute("class",type);
  output.innerHTML = message;
}

function printData()
{
  let oldPage = document.body.innerHTML;
  let exportButton = document.getElementById("sheetjsexport");
  let printButton = document.getElementById("printbutton");

  var tble = document.getElementById("TableToExport");

      
  var row = tble.rows; // Getting the rows
  for (var i = 0; i < row.length; i++) {
    row[i].deleteCell(0);
  }
  exportButton.remove();
  printButton.remove();
  let divElements = document.getElementById("container").innerHTML;
  
  //Reset the page's HTML with div's HTML only
  document.body.innerHTML = 
    "<html><head><title></title></head><body>" + 
    divElements + "</body>";
  //Print Page
  window.print();
  //Restore orignal HTML
  document.body.innerHTML = oldPage;
}
