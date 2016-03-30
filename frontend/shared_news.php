<?php
//echo $_SERVER["QUERY_STRING"];
parse_str($_SERVER["QUERY_STRING"], $data);
//var_dump($data);
$newsId = $data["id"];
$language = $data["l"];

//echo $newsId, "<br>";
//echo $language, "<br>";

$json = file_get_contents('https://prod.api.preppo.in/v1/app/news/'. $newsId);
$obj = json_decode($json);
//echo "Fetched news id" . $obj->_id;

$heading = $obj->content->english->heading;
$imageUrl = $obj->imageWeb;
$point1 = $obj->content->english->points[0];
?>

<!doctype html>
<html style="height: 100%;">
    <head>
        <meta charset="utf-8">
        <title><?=$heading?> | Preppo</title>
        <meta name="viewport" content="width=device-width">
        
        <meta property="og:title" content="<?=$heading?> | Preppo" />
        <meta property="og:image" content="<?=$imageUrl?>" />
        <meta property="og:description" content="<?=$point1?>" />
        
        <meta name="description" content="Prepare for IBPS PO, IBPS Clerk, SBI PO, SBI Clerk, SSC CGL, SSC CHSL & UPSC exams on the move by keeping yourself updated with GK & daily Current Affairs. Study in both English and Hindi, take daily updated quizzes specially designed for each exam and test your preparation"/>
        <meta name="keywords" content="SBI PO, SBI Po Exam, SBI Recruitment, SBI PO Recruitment, sbi bank po, sbi po online, sbi jobs, sbi careers, SBI Clerk, SBI Associate Clerk, SBI Exams, Banking Exams, GK, current affairs, current affairs 2016, banking current affairs, upsc current affairs, IBPS PO, IBPS Clerk, SSC, SSC CGL, SSC CHSL, Railways, LIC AAO, Banking jobs"/>
        
        <link rel="icon" href="https://preppo.in/favicon.png" />
        
        <style>
            @font-face {
                font-family: 'charter';
                src: url('https://preppo.in/fonts/charter.ttf');
            }

            @font-face {
                font-family: 'robMed';
                src: url('https://preppo.in/fonts/Roboto-Medium.ttf');
            }

            @font-face {
                font-family: 'robReg';
                src: url('https://preppo.in/fonts/Roboto-Regular.ttf');
            }
            #navbar-top {
                position: fixed;
                top: 0px;
                left: 0px;
                height: 50px;
                width: 100%;
                background-color: rgb(62, 80, 180);
                padding: 10px 18px 0px 24px;
                box-sizing: border-box;
                -moz-box-sizing: border-box;
                -webkit-box-sizing: border-box;
            }
            .toggle-button { 
                background-color: #00bf15; margin: 0px; border-radius: 6px; height: 12px; cursor: pointer; width: 40px; position: relative; display: inline-block; user-select: none; -webkit-user-select: none; -ms-user-select: none; -moz-user-select: none; 
            }

            .toggle-button > .left { 
                cursor: pointer; outline: 0; display:block; position: absolute; left: -3px; top: -3px; border-radius: 50%; background-color: white; margin: 0px; transition: left 0.3s; border: none; width: 18px; height: 18px; box-shadow: 0 0 4px rgba(0,0,0,0.1);
            }

            .toggle-button > .right { 
                cursor: pointer; outline: 0; display:block; position: absolute; left: 24px; top: -3px; border-radius: 50%; background-color: white; margin: 0px; transition: left 0.3s; border: none; width: 18px; height: 18px; box-shadow: 0 0 4px rgba(0,0,0,0.1);
            }
            .lang-font {
                font-family: 'robReg';
                font-size: 14px;
                color: white;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .gradient-background {
                background: -webkit-linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 1)); /* For Safari 5.1 to 6.0 */
                background: -o-linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 1)); /* For Opera 11.1 to 12.0 */
                background: -moz-linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 1)); /* For Firefox 3.6 to 15 */
                background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 1)); /* Standard syntax */
            }
            .blank-space {
                height:42px;
                background-color: rgba(0, 0, 0, 0);
                border-radius: 2px 2px 0px 0px;
            }
            #news-update-main {
                width: 520px;
                padding-top: 100px;
                margin: 0 auto;
                max-width: 95%;
            }
            #news-card {
                width: 100%;
                height: 420px;
                background-color: white;
                box-sizing: border-box;
                -moz-box-sizing: border-box;
                -webkit-box-sizing: border-box;
                box-shadow: 0 2px 4px 0 rgba(0,0,0,0.16),0 2px 10px 0 rgba(0,0,0,0.12);
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            #news-heading {
                height:24px;
                background-color: rgba(0, 0, 0, 0);
                color: white;
                padding: 0px 24px 0px 24px;
                line-height: 24px;
                font-size: 19px;
                font-family: 'robMed';
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            #news-content {
                width: 100%;
                height: 280px;
                overflow-y: auto;
                padding: 24px 24px 6px 24px;
                box-sizing: border-box;
                -moz-box-sizing: border-box;
                -webkit-box-sizing: border-box;
            }
            .news-points {
                line-height: 22px;
                font-size: 15px;
                font-family: 'charter';
                color: #212121;
                box-sizing: border-box;
                -moz-box-sizing: border-box;
                -webkit-box-sizing: border-box;
                margin-bottom: 16px;
            }
            
            @media (max-width: 768px) {
                .blank-space {
                    height: 40px;
                }
                #news-update-main {
                    padding-top: 50px;
                }
                #news-heading {
                    height:20px;
                    padding: 0px 12px 0px 12px;
                    line-height: 20px;
                    font-size: 17px;
                }
                #news-content {
                    padding: 12px 12px 6px 12px;
                    height: 240px;
                }
                .news-points {
                    line-height: 18px;
                    font-size: 13px;
                    margin-bottom: 14px;
                }
                #news-card {
                    height: 380px;
                }
            }
        </style>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js"></script>
    </head>
    
    <body style="height: 100%; background-color: #f5f5f5;">
        <div id="navbar-top">
            <a href="https://preppo.in"><img src="https://preppo.in/dashboard/resources/logo.svg" style="height: 36px; width: 90px; float:left;"></a>
            <div class="lang-font" style="float: right; padding: 6px 12px 6px 3px;">हिंदी</div>
            <div style="float: right; padding: 6px 12px;">
                <div class="toggle-button" onclick="changeLang()">
                    <button class="left"></button>
                </div>
            </div>
            <div class="lang-font" style="float: right; padding: 6px 0px;">Eng</div>
        </div>
        <div id="news-update-main" style="z-index: 200;">
            <div id="news-card">
                <div id="news-header" style="width: 100%; height: 100px; background-size: cover; background-position: center; border-radius: 4px 4px 0px 0px;">
                    <div class="gradient-background" style="height: 100%; width: 100%; border-radius: 2px 2px 0px 0px;">
                        <div class="blank-space"></div>
                        <div id="news-heading"></div>
                    </div>
                </div>
                <div id="news-content">  
                </div>
            </div>        
        </div>
        <script>
            var getUrlParameter = function getUrlParameter(sParam) {
                var sPageURL = decodeURIComponent(window.location.search.substring(1)),
                    sURLVariables = sPageURL.split('&'),
                    sParameterName,
                    i;

                for (i = 0; i < sURLVariables.length; i++) {
                    sParameterName = sURLVariables[i].split('=');

                    if (sParameterName[0] === sParam) {
                        return sParameterName[1] === undefined ? true : sParameterName[1];
                    }
                }
            };
            
            var dataG;
            var id = getUrlParameter('id');
            var l = getUrlParameter('l');
            var lang = (l=="h")?"hindi":"english";
            
            function prettify(str) {
                str = str.replace(/&nbsp;/g, "");
                str = str.replace(/<br>/g, "");
                str = str.replace(/<br\/>/g, "");
                str = str.replace(/<br >/g, "");
                str = str.replace(/<br \/>/g, "");
                return str;
            }
            
            function changeLang() {
                if(lang=="english") {
                    $('.toggle-button button').removeClass('left');
                    $('.toggle-button button').addClass('right');
                    lang = "hindi";
                    $('#news-heading').html(dataG.content[lang].heading);
                    $('#news-content').empty();
                    var arr = dataG.content[lang].points;
                    for(var i=0; i<arr.length; i++) {
                        var para = $("<p></p>").html((i+1).toString() + ". " + prettify(arr[i]));
                        para.addClass('news-points');
                        $('#news-content').append(para);
                    }
                }
                else {
                    $('.toggle-button button').removeClass('right');
                    $('.toggle-button button').addClass('left');
                    lang = "english";
                    $('#news-heading').html(dataG.content[lang].heading);
                    $('#news-content').empty();
                    var arr = dataG.content[lang].points;
                    for(var i=0; i<arr.length; i++) {
                        var para = $("<p></p>").html((i+1).toString() + ". " + prettify(arr[i]));
                        para.addClass('news-points');
                        $('#news-content').append(para);
                    }
                }
            }
            
            
            $(document).ready(function(){
                if(lang == "hindi") {
                    $('.toggle-button button').removeClass('left');
                    $('.toggle-button button').addClass('right');
                }
                console.log("reached here 1");
                dataG = <?=$json?>;
                data = dataG;
                console.log("reached here 2" + dataG.content.english.heading);
                var imageUrl = data.imageWeb;
                $('#news-header').css('background-image', 'url("' + imageUrl + '")');
                $('#news-heading').html(data.content[lang].heading);
                var arr = data.content[lang].points;
                for(var i=0; i<arr.length; i++) {
                    var para = $("<p></p>").html((i+1).toString() + ". " + prettify(arr[i]));
                    para.addClass('news-points');
                    $('#news-content').append(para);   
                }
            });
        </script>
    </body>
</html>