from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    N: float = Field(..., ge=0)
    P: float = Field(..., ge=0)
    K: float = Field(..., ge=0)
    pH: float = Field(..., ge=0)
    moisture: float = Field(..., ge=0)
