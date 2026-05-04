(function(){
  function addClearButtons(){
    document.querySelectorAll("#v_allcalcs .ac-card").forEach(function(card){
      var next = card.nextSibling;
      while (next && next.nodeType === 3) next = next.nextSibling;
      if (next && next.classList && next.classList.contains("ata-simple-clear-btn")) return;

      var btn = document.createElement("button");
      btn.className = "ata-simple-clear-btn";
      btn.textContent = "× Очистить";
      btn.style.cssText = [
        "width:100%",
        "margin-top:4px",
        "margin-bottom:8px",
        "padding:7px",
        "border:none",
        "border-radius:10px",
        "background:#2c2c2e",
        "color:#8e8e93",
        "font-size:.6rem",
        "letter-spacing:1px",
        "cursor:pointer",
        "text-transform:uppercase",
        "display:block"
      ].join(";");

      btn.onclick = function(e){
        e.stopPropagation();
        card.querySelectorAll("input[type=number], input[type=text]").forEach(function(el){
          el.value = "";
        });
        card.querySelectorAll("select").forEach(function(el){
          el.selectedIndex = 0;
        });
        card.querySelectorAll(".ac-result, .result-box").forEach(function(el){
          el.style.display = "none";
          el.classList.remove("show");
        });
      };

      card.parentNode.insertBefore(btn, card.nextSibling);
    });
  }

  if (typeof window.renderAllCalcs === "function"){
    var orig = window.renderAllCalcs;
    window.renderAllCalcs = function(){
      var r = orig.apply(this, arguments);
      setTimeout(addClearButtons, 300);
      return r;
    };
  }
  setTimeout(addClearButtons, 1000);
})();
