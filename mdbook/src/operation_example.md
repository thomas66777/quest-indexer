## Operation Metadata
Below is the `json` returned from the `RPC` endpoint: `chains/main/blocks/106434` on edo2net.
This is filtered to only show operation `op62w7HB6YYgedeuH8p16KGeWicJaKHuQKssDhjdfUGzhvM27tb`
```json
{
...
    [
      {
        "protocol": "PtEdo2ZkT9oKpimTah6x2embF25oss54njMuPzkJTEi5RqfdZFA",
        "chain_id": "NetXSgo1ZT2DRUG",
        "hash": "op62w7HB6YYgedeuH8p16KGeWicJaKHuQKssDhjdfUGzhvM27tb",
        "branch": "BLHXgvaT6LRMJRrQXvZipWVeBXRTgYfzNBXHzZruQnjuqj2Y9ru",
        "contents": [
          {
            "kind": "reveal",
            "source": "tz1Wwioir9n34AL3wDiPE2fP7KvjPgL7HNst",
            "fee": "0",
            "counter": "167931",
            "gas_limit": "1000",
            "storage_limit": "0",
            "public_key": "edpkv5JWFj32McSbdVybgUpbYk3VKptDZMQzJcqjL1Mq9GojxML7JJ",
            "metadata": {
              "balance_updates": [],
              "operation_result": {
                "status": "applied",
                "consumed_gas": "1000",
                "consumed_milligas": "1000000"
              }
            }
          },
          {
            "kind": "transaction",
            "source": "tz1Wwioir9n34AL3wDiPE2fP7KvjPgL7HNst",
            "fee": "6448",
            "counter": "167932",
            "gas_limit": "60000",
            "storage_limit": "150",
            "amount": "0",
            "destination": "KT1RUSCZ7pJ3WNTuXFD44UpStmNRjA459guZ",
            "parameters": {
              "entrypoint": "reward",
              "value": {
                "prim": "Unit"
              }
            },
            "metadata": {
              "balance_updates": [
                {
                  "kind": "contract",
                  "contract": "tz1Wwioir9n34AL3wDiPE2fP7KvjPgL7HNst",
                  "change": "-6448"
                },
                {
                  "kind": "freezer",
                  "category": "fees",
                  "delegate": "tz1cXeGHP8Urj2pQRwpAkCdPGbCdqFUPsQwU",
                  "cycle": 51,
                  "change": "6448"
                }
              ],
              "operation_result": {
                "status": "applied",
                "storage": {
                  "prim": "Pair",
                  "args": [
                    [
                      {
                        "prim": "Pair",
                        "args": [
                          {
                            "prim": "Pair",
                            "args": [
                              {
                                "bytes": "00009c8671920e9b4ac694058b5a69fedf3dede6ed5a"
                              },
                              {
                                "prim": "False"
                              }
                            ]
                          },
                          {
                            "prim": "None"
                          }
                        ]
                      },
                      {
                        "prim": "Pair",
                        "args": [
                          {
                            "int": "38166"
                          },
                          {
                            "int": "38167"
                          }
                        ]
                      },
                      {
                        "int": "38168"
                      },
                      {
                        "int": "38169"
                      }
                    ],
                    {
                      "prim": "Pair",
                      "args": [
                        {
                          "int": "38170"
                        },
                        {
                          "int": "38171"
                        }
                      ]
                    }
                  ]
                },
                "big_map_diff": [
                  {
                    "action": "update",
                    "big_map": "38171",
                    "key_hash": "exprtzDnCQrxKrWA8Cwd1XLDy8KrZWx8e3JYq1Wqcu5aFRBDUgzbBP",
                    "key": {
                      "bytes": "00007c01f0b92731849bd501249bf4a30d48240e21e8"
                    },
                    "value": {
                      "prim": "Pair",
                      "args": [
                        {
                          "int": "1616393129"
                        },
                        {
                          "int": "0"
                        }
                      ]
                    }
                  },
                  {
                    "action": "update",
                    "big_map": "38166",
                    "key_hash": "expruY8oYiagXWP11Z4Air5BKpqYcwErCxkQQpzKbnFey4Pkig7eN2",
                    "key": {
                      "prim": "Pair",
                      "args": [
                        {
                          "bytes": "00007c01f0b92731849bd501249bf4a30d48240e21e8"
                        },
                        {
                          "int": "16"
                        }
                      ]
                    },
                    "value": {
                      "int": "1"
                    }
                  },
                  {
                    "action": "update",
                    "big_map": "38166",
                    "key_hash": "expru3SULaK5xPwNKyhevUwzYZabWMbNjAekNxsrzn2qLk4zAZ98ZN",
                    "key": {
                      "prim": "Pair",
                      "args": [
                        {
                          "bytes": "00009c8671920e9b4ac694058b5a69fedf3dede6ed5a"
                        },
                        {
                          "int": "16"
                        }
                      ]
                    },
                    "value": {
                      "int": "49999"
                    }
                  }
                ],
                "balance_updates": [
                  {
                    "kind": "contract",
                    "contract": "tz1Wwioir9n34AL3wDiPE2fP7KvjPgL7HNst",
                    "change": "-35500"
                  }
                ],
                "consumed_gas": "33399",
                "consumed_milligas": "33398290",
                "storage_size": "16793",
                "paid_storage_size_diff": "142",
                "lazy_storage_diff": [
                  {
                    "kind": "big_map",
                    "id": "38171",
                    "diff": {
                      "action": "update",
                      "updates": [
                        {
                          "key_hash": "exprtzDnCQrxKrWA8Cwd1XLDy8KrZWx8e3JYq1Wqcu5aFRBDUgzbBP",
                          "key": {
                            "bytes": "00007c01f0b92731849bd501249bf4a30d48240e21e8"
                          },
                          "value": {
                            "prim": "Pair",
                            "args": [
                              {
                                "int": "1616393129"
                              },
                              {
                                "int": "0"
                              }
                            ]
                          }
                        }
                      ]
                    }
                  },
                  {
                    "kind": "big_map",
                    "id": "38170",
                    "diff": {
                      "action": "update",
                      "updates": []
                    }
                  },
                  {
                    "kind": "big_map",
                    "id": "38169",
                    "diff": {
                      "action": "update",
                      "updates": []
                    }
                  },
                  {
                    "kind": "big_map",
                    "id": "38168",
                    "diff": {
                      "action": "update",
                      "updates": []
                    }
                  },
                  {
                    "kind": "big_map",
                    "id": "38167",
                    "diff": {
                      "action": "update",
                      "updates": []
                    }
                  },
                  {
                    "kind": "big_map",
                    "id": "38166",
                    "diff": {
                      "action": "update",
                      "updates": [
                        {
                          "key_hash": "expru3SULaK5xPwNKyhevUwzYZabWMbNjAekNxsrzn2qLk4zAZ98ZN",
                          "key": {
                            "prim": "Pair",
                            "args": [
                              {
                                "bytes": "00009c8671920e9b4ac694058b5a69fedf3dede6ed5a"
                              },
                              {
                                "int": "16"
                              }
                            ]
                          },
                          "value": {
                            "int": "49999"
                          }
                        },
                        {
                          "key_hash": "expruY8oYiagXWP11Z4Air5BKpqYcwErCxkQQpzKbnFey4Pkig7eN2",
                          "key": {
                            "prim": "Pair",
                            "args": [
                              {
                                "bytes": "00007c01f0b92731849bd501249bf4a30d48240e21e8"
                              },
                              {
                                "int": "16"
                              }
                            ]
                          },
                          "value": {
                            "int": "1"
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }
          }
        ],
        "signature": "sigWRnJdY8YyPqWbyJ4av27SimJ3KFXkGgHUhLB9iEHctN4CrnpxSRHogVoRwKztjTCajb7KFQkUgWjTHCvpTab5moPPqvCE"
      }
    ]
...
}
```