pragma solidity ^0.6.1;

abstract contract LachesisLike{
	function tokens(address t) public virtual returns (bool);
}