"use strict";
(function(root){
  class SubmissionError extends Error {
    constructor(code,message,retryable=false){super(message);this.code=code;this.retryable=retryable;}
  }
  async function requestJSON(url,options={},timeoutMs=15000){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{...options,credentials:"omit",signal:controller.signal});
      if(!response.ok){
        const messages={
          403:"The response server denied this request. Open the official study link in your browser. If this continues, download your ratings and send the file to the organizer.",
          409:"The server already holds a different completed response for this ID. Download your ratings and send the file to the organizer for checking.",
          422:"The server could not validate these answers. Review all questions, or download your ratings and send the file to the organizer."
        };
        throw new SubmissionError("HTTP "+response.status,messages[response.status]||"The response server returned HTTP "+response.status+". Retry, or download your ratings and send the file to the organizer.",response.status>=500||response.status===429||response.status===408);
      }
      try{return await response.json();}
      catch{throw new SubmissionError("INVALID_RESPONSE","The server did not return a valid confirmation. Download your ratings as a backup and retry.",true);}
    }catch(error){
      if(error instanceof SubmissionError)throw error;
      const code=controller.signal.aborted?"TIMEOUT":"CONNECTION";
      throw new SubmissionError(code,code==="TIMEOUT"?
        "The response server did not answer in time. Download your ratings as a backup, then retry.":
        "This browser could not connect to the response server. Download your ratings as a backup, then retry on a connection that can reach the server.",true);
    }finally{clearTimeout(timer);}
  }
  async function send(url,payload,expected,onAttempt=()=>{},attempts=3){
    // Reuse exactly the same payload on retries, including after a lost receipt.
    const body=JSON.stringify(payload);
    for(let attempt=1;attempt<=attempts;attempt++){
      onAttempt(attempt,attempts);
      try{
        const result=await requestJSON(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body});
        if(result.version!==expected.version||result.participant!==expected.participant||typeof result.receipt!=="string"||!result.receipt){
          throw new SubmissionError("CONFIRMATION_MISMATCH","The server confirmation did not match this submission. Download your ratings and contact the organizer.");
        }
        return result;
      }catch(error){
        if(!error.retryable||attempt===attempts)throw error;
        await new Promise(resolve=>setTimeout(resolve,attempt*1000));
      }
    }
  }
  root.StudySubmission={requestJSON,send,SubmissionError};
})(globalThis);
